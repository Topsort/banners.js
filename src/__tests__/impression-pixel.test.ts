import type { LitElement } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Banner } from "../types";

vi.mock("../auction", () => ({
  runAuction: vi.fn(),
  getDeviceType: vi.fn().mockReturnValue("desktop"),
}));

import "../index";
import { runAuction } from "../auction";

const PIXEL = "https://ad.doubleclick.net/ddm/trackimp/N123;ord=[timestamp];dc_lat=";

let pixels: string[];

function makeBanner(overrides: Partial<Banner> = {}): Banner {
  return {
    type: "url",
    id: "b1",
    resolvedBidId: "bid-1",
    asset: [{ url: "https://example.com/banner.jpg", content: { impressionPixelUrl: PIXEL } }],
    isFallback: false,
    ...overrides,
  };
}

async function mount(banner: Banner, predefinedMarkup?: string): Promise<Element> {
  vi.mocked(runAuction).mockResolvedValue([banner]);
  const el = document.createElement("topsort-banner");
  el.setAttribute("id", "slot-1");
  if (predefinedMarkup !== undefined) {
    el.setAttribute("predefined", "");
    el.innerHTML = predefinedMarkup;
  }
  document.body.appendChild(el);
  await (el as LitElement).updateComplete;
  await new Promise<void>((r) => setTimeout(r, 0));
  await (el as LitElement).updateComplete;
  return el;
}

/**
 * What analytics.js dispatches once it logs an event. It only watches elements
 * carrying `data-ts-resolved-bid`, so without one nothing is reported.
 */
function report(el: Element, type: string, bid = "bid-1") {
  el.querySelector("[data-ts-resolved-bid]")?.dispatchEvent(
    new CustomEvent("topsort", { bubbles: true, detail: { type, bid } }),
  );
}

beforeEach(() => {
  window.TS = { token: "test-token", gatedImpressions: true };
  pixels = [];
  vi.stubGlobal(
    "Image",
    class {
      set src(value: string) {
        pixels.push(value);
      }
    },
  );
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("impression pixel", () => {
  it("renders a standard banner whose only content is the pixel", async () => {
    const el = await mount(makeBanner());

    expect(el.querySelector("img")?.getAttribute("src")).toBe("https://example.com/banner.jpg");
  });

  it("does not fire when the auction resolves", async () => {
    await mount(makeBanner());

    expect(pixels).toEqual([]);
  });

  it("does not fire on a Render event", async () => {
    const el = await mount(makeBanner());

    report(el, "Render");

    expect(pixels).toEqual([]);
  });

  it("fires once on the impression, with the cache-buster filled in", async () => {
    const el = await mount(makeBanner());

    report(el, "Impression");
    report(el, "Impression");

    expect(pixels).toHaveLength(1);
    expect(pixels[0]).toMatch(/^https:\/\/ad\.doubleclick\.net\/ddm\/trackimp\/N123;ord=\d+;/);
  });

  it("ignores impressions for other bids", async () => {
    const el = await mount(makeBanner());

    report(el, "Impression", "bid-other");

    expect(pixels).toEqual([]);
  });

  it("does not fire for fallback banners", async () => {
    const el = await mount(makeBanner({ resolvedBidId: "bid-fallback", isFallback: true }));

    report(el, "Impression", "bid-fallback");

    expect(pixels).toEqual([]);
  });

  it("does not fire when analytics.js does not gate impressions", async () => {
    const el = await mount(makeBanner({ resolvedBidId: "bid-ungated" }));
    window.TS = { token: "test-token" };

    report(el, "Impression", "bid-ungated");

    expect(pixels).toEqual([]);
  });

  it("fires in predefined mode when the content holds only the pixel", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const el = await mount(
      makeBanner({ resolvedBidId: "bid-predefined" }),
      '<div data-ts-clickable><img data-ts-field="mainImage:src" src="default.jpg" /></div>',
    );

    const wrapper = el.querySelector("[data-ts-clickable]");
    expect(wrapper?.getAttribute("data-ts-resolved-bid")).toBe("bid-predefined");
    expect(el.querySelector("img")?.getAttribute("src")).toBe("default.jpg");

    report(el, "Impression", "bid-predefined");

    expect(pixels).toHaveLength(1);
    warn.mockRestore();
  });
});
