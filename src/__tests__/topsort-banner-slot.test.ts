import type { LitElement } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as templateModule from "../template";
import type { Banner, BannerContext } from "../types";

vi.mock("../auction", () => ({
  runAuction: vi.fn(),
  getDeviceType: vi.fn().mockReturnValue("desktop"),
}));

import "../index";

function setWindowTS(token = "test-token") {
  Object.defineProperty(window, "TS", {
    value: { token },
    writable: true,
    configurable: true,
  });
}

function mountSlot(attrs: Record<string, string> = {}): Element {
  const el = document.createElement("topsort-banner-slot");
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

async function setContext(el: Element, ctx: BannerContext): Promise<void> {
  // @consume sets up a property; setting it directly triggers Lit's reactive update.
  (el as LitElement & { context: BannerContext }).context = ctx;
  await (el as LitElement).updateComplete;
}

function makeBanner(overrides: Partial<Banner> = {}): Banner {
  return {
    type: "url",
    id: "b1",
    resolvedBidId: "bid-1",
    asset: [{ url: "https://example.com/banner.jpg" }],
    isFallback: false,
    ...overrides,
  };
}

const baseCtx: BannerContext = { width: 300, height: 250, newTab: false };

beforeEach(() => {
  setWindowTS();
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("TopsortBannerSlot", () => {
  it("renders empty when no context has arrived", async () => {
    const el = mountSlot({ rank: "1" });
    await (el as LitElement).updateComplete;
    // No context — render() returns html`` (empty)
    expect(el.querySelector("img")).toBeNull();
    expect(el.querySelector(".ts-banner")).toBeNull();
  });

  it("renders loading element while banners are pending", async () => {
    const el = mountSlot({ rank: "1" });
    await (el as LitElement).updateComplete;
    // Context arrived but banners not yet set
    await setContext(el, { ...baseCtx }); // no banners property
    // Default getLoadingElement returns empty — component is still connected
    expect(el.isConnected).toBe(true);
    expect(el.querySelector("img")).toBeNull();
  });

  it("renders <img> for the banner at its rank", async () => {
    const winner = makeBanner();
    const el = mountSlot({ rank: "1" });
    await (el as LitElement).updateComplete;
    await setContext(el, { ...baseCtx, banners: [winner] });
    const img = el.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://example.com/banner.jpg");
  });

  it("renders no-winners element when context has fewer banners than rank", async () => {
    const el = mountSlot({ rank: "2" }); // rank 2 but only 1 winner
    await (el as LitElement).updateComplete;
    await setContext(el, { ...baseCtx, banners: [makeBanner()] });
    // Default no-winners renders empty
    expect(el.querySelector("img")).toBeNull();
    expect(el.querySelector(".ts-banner")).toBeNull();
  });

  it("renders error element when context carries an error", async () => {
    const el = mountSlot({ rank: "1" });
    await (el as LitElement).updateComplete;
    // banners must be defined (even empty) for error branch to be reached
    await setContext(el, { ...baseCtx, banners: [], error: new Error("auction failed") });
    // Default getErrorElement renders empty
    expect(el.querySelector("img")).toBeNull();
    expect(el.querySelector(".ts-banner")).toBeNull();
  });

  it("predefined mode: applies template when banners arrive via context", async () => {
    const winner = makeBanner({ asset: [{ url: "x", content: { label: "World" } }] });
    const el = mountSlot({ rank: "1", predefined: "" });
    el.innerHTML = '<span data-ts-field="label">old</span>';
    await (el as LitElement).updateComplete;
    // Simulate banners arriving (transition from undefined → defined)
    await setContext(el, { ...baseCtx, banners: [winner] });
    expect(el.querySelector("span")?.textContent).toBe("World");
  });

  it("predefined mode: winner with no content map leaves template unchanged and warns", async () => {
    const winner = makeBanner(); // asset has no content field
    const warnSpy = vi.spyOn(console, "warn");
    const el = mountSlot({ rank: "1", predefined: "" });
    await (el as LitElement).updateComplete;
    await setContext(el, { ...baseCtx, banners: [winner] });
    // No image banner rendered — template stays unchanged
    expect(el.querySelector("img")).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("no content map"));
  });

  it("predefined mode: slot survives applyTemplate throw", async () => {
    const winner = makeBanner({ asset: [{ url: "x", content: { label: "World" } }] });
    vi.spyOn(templateModule, "applyTemplate").mockImplementationOnce(() => {
      throw new Error("DOM error");
    });
    const el = mountSlot({ rank: "1", predefined: "" });
    el.innerHTML = '<span data-ts-field="label">old</span>';
    await (el as LitElement).updateComplete;
    await setContext(el, { ...baseCtx, banners: [winner] });
    // Slot remains connected and no exception propagates
    expect(el.isConnected).toBe(true);
    vi.restoreAllMocks();
  });
});
