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

  // Regression: banners.js must not write an identifier cookie. analytics.js owns it, and a
  // merchant may delay analytics.js until the user consents.
  it("returns undefined and writes no cookie when neither getUserId nor the cookie exist", () => {
    const setter = vi.spyOn(Document.prototype, "cookie", "set");
    setWindowTS({ token: "tok" });
    expect(getOpaqueUserId()).toBeUndefined();
    expect(setter).not.toHaveBeenCalled();
    expect(readCookie("tsuid")).toBeUndefined();
    setter.mockRestore();
  });

  // Regression: reading document.cookie throws in opaque-origin documents (sandboxed iframes).
  // The auction must still run without an ID instead of failing.
  it("returns undefined when reading document.cookie throws", () => {
    const getter = vi.spyOn(Document.prototype, "cookie", "get").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });
    setWindowTS({ token: "tok" });
    expect(getOpaqueUserId()).toBeUndefined();
    getter.mockRestore();
  });
});
