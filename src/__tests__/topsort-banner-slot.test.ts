import type { LitElement } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as templateModule from "../template";
import type { Banner, BannerContext } from "../types";

vi.mock("../auction", () => ({
  runAuction: vi.fn(),
  getDeviceType: vi.fn().mockReturnValue("desktop"),
}));

import "../index";
import { runAuction } from "../auction";

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
    el.innerHTML = '<span data-ts-field="label:textContent">old</span>';
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
    el.innerHTML = '<span data-ts-field="label:textContent">old</span>';
    await (el as LitElement).updateComplete;
    await setContext(el, { ...baseCtx, banners: [winner] });
    // Slot remains connected and no exception propagates
    expect(el.isConnected).toBe(true);
    vi.restoreAllMocks();
  });

  describe("language propagation via context", () => {
    it("uses translated value from the context language", async () => {
      const winner = makeBanner({
        asset: [
          {
            url: "x",
            content: { ctaText: "Default", enUSctaText: "EN value" },
          },
        ],
      });
      const el = mountSlot({ rank: "1", predefined: "" });
      el.innerHTML = '<span data-ts-field="ctaText:textContent">old</span>';
      await (el as LitElement).updateComplete;
      await setContext(el, { ...baseCtx, language: "en-US", banners: [winner] });
      expect(el.querySelector("span")?.textContent).toBe("EN value");
    });

    it("falls back to base field when context has no language", async () => {
      const winner = makeBanner({
        asset: [
          {
            url: "x",
            content: { ctaText: "Default", enUSctaText: "EN value" },
          },
        ],
      });
      const el = mountSlot({ rank: "1", predefined: "" });
      el.innerHTML = '<span data-ts-field="ctaText:textContent">old</span>';
      await (el as LitElement).updateComplete;
      await setContext(el, { ...baseCtx, banners: [winner] });
      expect(el.querySelector("span")?.textContent).toBe("Default");
    });

    it("re-applies template when context language changes after banners arrive", async () => {
      const winner = makeBanner({
        asset: [
          {
            url: "x",
            content: {
              ctaText: "Default",
              enUSctaText: "EN value",
              frFRctaText: "FR value",
            },
          },
        ],
      });
      const el = mountSlot({ rank: "1", predefined: "" });
      el.innerHTML = '<span data-ts-field="ctaText:textContent">old</span>';
      await (el as LitElement).updateComplete;
      await setContext(el, { ...baseCtx, language: "en-US", banners: [winner] });
      expect(el.querySelector("span")?.textContent).toBe("EN value");

      await setContext(el, { ...baseCtx, language: "fr-FR", banners: [winner] });
      expect(el.querySelector("span")?.textContent).toBe("FR value");
    });

    it("does not re-emit statechange when only language changes", async () => {
      const winner = makeBanner({
        asset: [
          {
            url: "x",
            content: { ctaText: "Default", enUSctaText: "EN", frFRctaText: "FR" },
          },
        ],
      });
      const el = mountSlot({ rank: "1", predefined: "" });
      el.innerHTML = '<span data-ts-field="ctaText:textContent">old</span>';
      const events: CustomEvent[] = [];
      el.addEventListener("statechange", (e) => events.push(e as CustomEvent));
      await (el as LitElement).updateComplete;
      await setContext(el, { ...baseCtx, language: "en-US", banners: [winner] });
      const countAfterReady = events.length;

      await setContext(el, { ...baseCtx, language: "fr-FR", banners: [winner] });
      expect(events.length).toBe(countAfterReady);
    });

    it("survives applyTemplate throwing during runtime language change", async () => {
      const winner = makeBanner({
        asset: [
          {
            url: "x",
            content: { ctaText: "Default", enUSctaText: "EN", frFRctaText: "FR" },
          },
        ],
      });
      const el = mountSlot({ rank: "1", predefined: "" });
      el.innerHTML = '<span data-ts-field="ctaText:textContent">old</span>';
      await (el as LitElement).updateComplete;
      await setContext(el, { ...baseCtx, language: "en-US", banners: [winner] });

      // Make only the runtime re-apply throw, not the initial application
      vi.spyOn(templateModule, "applyTemplate").mockImplementationOnce(() => {
        throw new Error("DOM error during re-apply");
      });
      await setContext(el, { ...baseCtx, language: "fr-FR", banners: [winner] });

      expect(el.isConnected).toBe(true);
      vi.restoreAllMocks();
    });
  });
});

describe("context auction errors", () => {
  let original: typeof window.TS_BANNERS;

  beforeEach(() => {
    original = window.TS_BANNERS;
  });

  afterEach(() => {
    window.TS_BANNERS = original;
  });

  function hookEl(name: string): HTMLElement {
    const el = document.createElement("div");
    el.setAttribute("data-hook", name);
    return el;
  }

  async function mountContext(): Promise<{ parent: Element; slot: Element }> {
    const parent = document.createElement("topsort-banner");
    parent.setAttribute("id", "slot-1");
    parent.setAttribute("context", "");
    const slot = document.createElement("topsort-banner-slot");
    slot.setAttribute("rank", "1");
    parent.appendChild(slot);
    document.body.appendChild(parent);
    await settle(parent, slot);
    return { parent, slot };
  }

  async function settle(parent: Element, slot: Element): Promise<void> {
    for (let i = 0; i < 2; i++) {
      await (parent as LitElement).updateComplete;
      await new Promise<void>((r) => setTimeout(r, 0));
      await (slot as LitElement).updateComplete;
    }
  }

  // Regression: render() checked `banners` before `error`, so a failed auction left
  // every slot on the loading element and getErrorElement never ran.
  it("renders getErrorElement with the error instead of the loading element", async () => {
    const error = new Error("auction failed");
    const getErrorElement = vi.fn(() => hookEl("error"));
    window.TS_BANNERS = {
      getErrorElement,
      getLoadingElement: () => hookEl("loading"),
    } as unknown as typeof window.TS_BANNERS;
    vi.mocked(runAuction).mockRejectedValue(error);
    const { slot } = await mountContext();
    expect(getErrorElement).toHaveBeenCalledWith(error);
    expect(slot.querySelectorAll("[data-hook]")).toHaveLength(1);
    expect(slot.querySelector('[data-hook="error"]')).not.toBeNull();
  });

  it("renders nothing when no getErrorElement hook is set", async () => {
    window.TS_BANNERS = {} as typeof window.TS_BANNERS;
    vi.mocked(runAuction).mockRejectedValue(new Error("auction failed"));
    const { slot } = await mountContext();
    expect(slot.children).toHaveLength(0);
  });

  // Regression: a successful auction after a failed one never cleared the old error.
  it("shows the banner, not the error, when a later auction succeeds", async () => {
    const getBannerElement = vi.fn(() => hookEl("banner"));
    window.TS_BANNERS = {
      getErrorElement: () => hookEl("error"),
      getBannerElement,
    } as unknown as typeof window.TS_BANNERS;
    vi.mocked(runAuction).mockRejectedValueOnce(new Error("auction failed"));
    const { parent, slot } = await mountContext();
    expect(slot.querySelector('[data-hook="error"]')).not.toBeNull();

    const winner = makeBanner();
    vi.mocked(runAuction).mockResolvedValue([winner]);
    await (parent as unknown as { task: { run(): Promise<void> } }).task.run();
    await settle(parent, slot);
    expect(getBannerElement).toHaveBeenCalledWith(winner);
    expect(slot.querySelector('[data-hook="error"]')).toBeNull();
    expect(slot.querySelector('[data-hook="banner"]')).not.toBeNull();
  });
});
