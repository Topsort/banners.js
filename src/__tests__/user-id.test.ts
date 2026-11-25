import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOpaqueUserId } from "../user-id";

type TSGlobal = { token: string; url?: string; getUserId?: () => string; cookieName?: string };

function setWindowTS(value: TSGlobal | undefined) {
  Object.defineProperty(window, "TS", {
    value,
    writable: true,
    configurable: true,
  });
}

function setCookie(value: string) {
  // biome-ignore lint/suspicious/noDocumentCookie: tests mirror how analytics.js writes the cookie.
  document.cookie = value;
}

function clearCookies() {
  for (const name of ["tsuid", "custom_uid"]) {
    setCookie(`${name}=;max-age=0`);
  }
}

function readCookie(name: string): string | undefined {
  return document.cookie
    .split(";")
    .map((c) => c.trim().split("="))
    .find(([key]) => key === name)?.[1];
}

describe("getOpaqueUserId", () => {
  beforeEach(() => {
    setWindowTS(undefined);
    clearCookies();
  });

  afterEach(() => {
    setWindowTS(undefined);
    clearCookies();
  });

  it("returns the user ID when getUserId returns a string", () => {
    setWindowTS({ token: "tok", getUserId: () => "user-123" });
    expect(getOpaqueUserId()).toBe("user-123");
  });

  it("prefers getUserId over an existing cookie", () => {
    setCookie("tsuid=cookie-id");
    setWindowTS({ token: "tok", getUserId: () => "user-123" });
    expect(getOpaqueUserId()).toBe("user-123");
  });

  // Regression: INTE-4067. Before analytics.js defines getUserId, the auction was sent without an
  // opaqueUserId. It must reuse the analytics.js cookie so auctions and events share one ID.
  it("returns the analytics.js cookie when getUserId is not defined yet", () => {
    setCookie("tsuid=cookie-id");
    setWindowTS({ token: "tok" });
    expect(getOpaqueUserId()).toBe("cookie-id");
  });

  it("reads the cookie named by window.TS.cookieName", () => {
    setCookie("tsuid=default-id");
    setCookie("custom_uid=custom-id");
    setWindowTS({ token: "tok", cookieName: "custom_uid" });
    expect(getOpaqueUserId()).toBe("custom-id");
  });

  it("creates the cookie when neither getUserId nor the cookie exist, and reuses it", () => {
    setWindowTS({ token: "tok" });
    const id = getOpaqueUserId();
    expect(id).toBeTruthy();
    expect(readCookie("tsuid")).toBe(id);
    expect(getOpaqueUserId()).toBe(id);
  });

  it("creates the cookie under window.TS.cookieName", () => {
    setWindowTS({ token: "tok", cookieName: "custom_uid" });
    const id = getOpaqueUserId();
    expect(id).toBeTruthy();
    expect(readCookie("custom_uid")).toBe(id);
    expect(readCookie("tsuid")).toBeUndefined();
  });

  // Regression: without path=/ the browser scopes the cookie to the current directory, so pages
  // under other paths cannot read it and mint a new ID, splitting one user across several IDs.
  it("creates the cookie with path=/ so it is shared across the whole site", () => {
    const setter = vi.spyOn(Document.prototype, "cookie", "set");
    setWindowTS({ token: "tok" });
    getOpaqueUserId();
    expect(setter).toHaveBeenCalledWith(expect.stringMatching(/;\s*path=\/(;|$)/));
    setter.mockRestore();
  });
});
