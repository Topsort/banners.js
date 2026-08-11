import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { warnIfImpressionsUngated } from "../index";

describe("analytics.js compatibility warning", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it("stays quiet when analytics.js gates impressions", () => {
    window.TS = { token: "token", gatedImpressions: true };

    warnIfImpressionsUngated();

    expect(warn).not.toHaveBeenCalled();
  });

  it("warns when analytics.js does not gate impressions", () => {
    window.TS = { token: "token" };

    warnIfImpressionsUngated();

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain("visibility-gated impressions");
  });

  it("warns when window.TS is missing entirely", () => {
    window.TS = undefined as unknown as Window["TS"];

    warnIfImpressionsUngated();

    expect(warn).toHaveBeenCalledOnce();
  });
});
