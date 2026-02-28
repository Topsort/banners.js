import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getOpaqueUserId } from "../user-id";

type TSGlobal = { token: string; url?: string; getUserId?: () => string };

function setWindowTS(value: TSGlobal | undefined) {
  Object.defineProperty(window, "TS", {
    value,
    writable: true,
    configurable: true,
  });
}

describe("getOpaqueUserId", () => {
  beforeEach(() => {
    setWindowTS(undefined);
  });

  afterEach(() => {
    setWindowTS(undefined);
  });

  it("returns undefined when window.TS is undefined", () => {
    expect(getOpaqueUserId()).toBeUndefined();
  });

  it("returns undefined when getUserId is not a function", () => {
    setWindowTS({ token: "tok" });
    expect(getOpaqueUserId()).toBeUndefined();
  });

  it("returns the user ID when getUserId returns a string", () => {
    setWindowTS({ token: "tok", getUserId: () => "user-123" });
    expect(getOpaqueUserId()).toBe("user-123");
  });
});
