import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDeviceType, runAuction } from "../auction";
import { TopsortRequestError } from "../errors";
import type { Auction } from "../types";

type TSGlobal = { token: string; url?: string; getUserId?: () => string };

function setWindowTS(config: TSGlobal) {
  Object.defineProperty(window, "TS", {
    value: config,
    writable: true,
    configurable: true,
  });
}

function mockFetch(response: { ok: boolean; status?: number; data: unknown }) {
  const mock = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? 200,
    json: () => Promise.resolve(response.data),
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

const baseAuction: Auction = {
  type: "banners",
  slots: 1,
  device: "desktop",
  slotId: "slot-1",
};

describe("getDeviceType", () => {
  const originalUA = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", { value: originalUA, configurable: true });
  });

  function setUA(ua: string) {
    Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });
  }

  it("returns 'desktop' for desktop user agent", () => {
    setUA(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0 Safari/537.36",
    );
    expect(getDeviceType()).toBe("desktop");
  });

  it("returns 'mobile' for iPhone user agent", () => {
    setUA(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
    );
    expect(getDeviceType()).toBe("mobile");
  });

  it("returns 'mobile' for Android mobile user agent", () => {
    setUA(
      "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0 Mobile Safari/537.36",
    );
    expect(getDeviceType()).toBe("mobile");
  });

  it("returns 'mobile' for iPad user agent", () => {
    setUA(
      "Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 Version/14.1 Mobile/15E148 Safari/604.1",
    );
    expect(getDeviceType()).toBe("mobile");
  });
});

describe("runAuction", () => {
  beforeEach(() => {
    setWindowTS({ token: "test-token" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns winners on successful response", async () => {
    const winners = [{ type: "url", id: "b1", resolvedBidId: "bid-1", asset: [{ url: "x" }] }];
    mockFetch({ ok: true, data: { results: [{ winners }] } });

    const result = await runAuction(
      { ...baseAuction },
      { signal: new AbortController().signal, logError: vi.fn() },
    );

    expect(result).toEqual(winners);
  });

  it("calls logError and throws TopsortRequestError on HTTP error", async () => {
    mockFetch({ ok: false, status: 400, data: { message: "Bad Request" } });
    const logError = vi.fn();

    const err = await runAuction(
      { ...baseAuction },
      { signal: new AbortController().signal, logError },
    ).catch((e) => e);
    expect(err).toBeInstanceOf(TopsortRequestError);
    expect(err.message).toBe("Bad Request");
    expect(err.status).toBe(400);
    expect(logError).toHaveBeenCalledWith({ message: "Bad Request" });
  });

  it("throws TopsortRequestError with HTTP status message when body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "",
        json: () => Promise.reject(new Error("not json")),
      }),
    );
    const err = await runAuction(
      { ...baseAuction },
      { signal: new AbortController().signal, logError: vi.fn() },
    ).catch((e) => e);
    expect(err).toBeInstanceOf(TopsortRequestError);
    expect(err.status).toBe(503);
    expect(err.message).toBe("HTTP 503");
  });

  it("throws TopsortRequestError when results array is empty", async () => {
    mockFetch({ ok: true, data: { results: [] } });

    await expect(
      runAuction({ ...baseAuction }, { signal: new AbortController().signal, logError: vi.fn() }),
    ).rejects.toThrow("No auction results");
  });

  it("calls logError and throws when result.error is set", async () => {
    mockFetch({ ok: true, data: { results: [{ error: "slot not found" }] } });
    const logError = vi.fn();

    await expect(
      runAuction({ ...baseAuction }, { signal: new AbortController().signal, logError }),
    ).rejects.toThrow("slot not found");
    expect(logError).toHaveBeenCalledWith("slot not found");
  });

  it("sends Bearer token in Authorization header", async () => {
    const fetchMock = mockFetch({ ok: true, data: { results: [{ winners: [] }] } });

    await runAuction(
      { ...baseAuction },
      { signal: new AbortController().signal, logError: vi.fn() },
    );

    const [, init] = fetchMock.mock.calls[0] as [
      URL,
      RequestInit & { headers: Record<string, string> },
    ];
    expect(init.headers.Authorization).toBe("Bearer test-token");
  });

  it("sends X-UA header containing PACKAGE_VERSION", async () => {
    const fetchMock = mockFetch({ ok: true, data: { results: [{ winners: [] }] } });

    await runAuction(
      { ...baseAuction },
      { signal: new AbortController().signal, logError: vi.fn() },
    );

    const [, init] = fetchMock.mock.calls[0] as [
      URL,
      RequestInit & { headers: Record<string, string> },
    ];
    expect(init.headers["X-UA"]).toContain("test");
  });

  it("includes opaqueUserId in body when getUserId returns a value", async () => {
    setWindowTS({ token: "test-token", getUserId: () => "user-abc" });
    const fetchMock = mockFetch({ ok: true, data: { results: [{ winners: [] }] } });

    await runAuction(
      { ...baseAuction },
      { signal: new AbortController().signal, logError: vi.fn() },
    );

    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    const body = JSON.parse(init.body as string) as { auctions: Auction[] };
    expect(body.auctions[0].opaqueUserId).toBe("user-abc");
  });

  it("uses window.TS.url when set", async () => {
    setWindowTS({ token: "test-token", url: "https://custom.api.com" });
    const fetchMock = mockFetch({ ok: true, data: { results: [{ winners: [] }] } });

    await runAuction(
      { ...baseAuction },
      { signal: new AbortController().signal, logError: vi.fn() },
    );

    const [url] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.href).toContain("custom.api.com");
  });

  it("falls back to api.topsort.com when url not set", async () => {
    const fetchMock = mockFetch({ ok: true, data: { results: [{ winners: [] }] } });

    await runAuction(
      { ...baseAuction },
      { signal: new AbortController().signal, logError: vi.fn() },
    );

    const [url] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.href).toContain("api.topsort.com");
  });

  it("forwards signal to fetch", async () => {
    const fetchMock = mockFetch({ ok: true, data: { results: [{ winners: [] }] } });
    const controller = new AbortController();

    await runAuction({ ...baseAuction }, { signal: controller.signal, logError: vi.fn() });

    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(init.signal).toBe(controller.signal);
  });
});
