import { describe, expect, it } from "vitest";
import { TopsortConfigurationError, TopsortRequestError } from "../errors";

describe("TopsortRequestError", () => {
  it("stores message, status, and name", () => {
    const err = new TopsortRequestError("not found", 404);
    expect(err.message).toBe("not found");
    expect(err.status).toBe(404);
    expect(err.name).toBe("TopsortRequestError");
  });

  it("isTopsortRequestError returns true for TopsortRequestError", () => {
    const err = new TopsortRequestError("test", 500);
    expect(TopsortRequestError.isTopsortRequestError(err)).toBe(true);
  });

  it("isTopsortRequestError returns false for generic Error", () => {
    const err = new Error("test");
    expect(TopsortRequestError.isTopsortRequestError(err)).toBe(false);
  });
});

describe("TopsortConfigurationError", () => {
  it("both missing → 'Missing API Key and Slot ID'", () => {
    const err = new TopsortConfigurationError();
    expect(err.message).toBe("Missing API Key and Slot ID");
    expect(err.name).toBe("TopsortConfigurationError");
  });

  it("apiKey provided, slotId missing → 'Missing Slot ID'", () => {
    const err = new TopsortConfigurationError("key123");
    expect(err.message).toBe("Missing Slot ID");
  });

  it("slotId provided, apiKey missing → 'Missing API Key'", () => {
    const err = new TopsortConfigurationError(undefined, "slot123");
    expect(err.message).toBe("Missing API Key");
  });

  it("isTopsortConfigurationError returns true for TopsortConfigurationError", () => {
    const err = new TopsortConfigurationError();
    expect(TopsortConfigurationError.isTopsortConfigurationError(err)).toBe(true);
  });

  it("isTopsortConfigurationError returns false for generic Error", () => {
    const err = new Error("test");
    expect(TopsortConfigurationError.isTopsortConfigurationError(err)).toBe(false);
  });
});
