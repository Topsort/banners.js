import type { LitElement } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as templateModule from "../template";
import type { Banner } from "../types";

vi.mock("../auction", () => ({
  runAuction: vi.fn(),
  getDeviceType: vi.fn().mockReturnValue("desktop"),
}));

import "../index";
import { runAuction } from "../auction";

function setWindowTS(token = "") {
  Object.defineProperty(window, "TS", {
    value: { token },
    writable: true,
    configurable: true,
  });
}

function mount(attrs: Record<string, string> = {}): Element {
  const el = document.createElement("topsort-banner");
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

/** Wait for the internal @lit/task to run + re-render. */
async function taskSettled(el: Element): Promise<void> {
  const lit = el as LitElement;
  await lit.updateComplete;
  // One event-loop tick lets the mock promise chain + Lit's async scheduling resolve.
  await new Promise<void>((r) => setTimeout(r, 0));
  await lit.updateComplete;
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

beforeEach(() => {
  setWindowTS("test-token");
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("TopsortBanner", () => {
  it("renders loading element while task is pending", async () => {
    // Never-resolving promise keeps task in PENDING state
    vi.mocked(runAuction).mockReturnValue(new Promise(() => {}));
    const el = mount({ id: "slot-1", width: "300", height: "250" });
    await (el as LitElement).updateComplete;
    // Default loading renders empty — verify element is connected with no img
    expect(el.isConnected).toBe(true);
    expect(el.querySelector("img")).toBeNull();
  });

  it("renders <img> banner on successful auction", async () => {
    vi.mocked(runAuction).mockResolvedValue([makeBanner()]);
    const el = mount({ id: "slot-1", width: "300", height: "250" });
    await taskSettled(el);
    const img = el.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://example.com/banner.jpg");
  });

  it("renders no-winners element when winners array is empty", async () => {
    vi.mocked(runAuction).mockResolvedValue([]);
    const el = mount({ id: "slot-1", width: "300", height: "250" });
    await taskSettled(el);
    expect(el.querySelector("img")).toBeNull();
    expect(el.querySelector(".ts-banner")).toBeNull();
  });

  it("renders error element when runAuction rejects", async () => {
    vi.mocked(runAuction).mockRejectedValue(new Error("network error"));
    const el = mount({ id: "slot-1", width: "300", height: "250" });
    await taskSettled(el);
    // Default error renders empty — verify no banner
    expect(el.querySelector("img")).toBeNull();
    expect(el.querySelector(".ts-banner")).toBeNull();
  });

  it("does not render banner when window.TS.token is missing", async () => {
    setWindowTS(); // empty token
    vi.mocked(runAuction).mockResolvedValue([makeBanner()]);
    const el = mount({ id: "slot-1" });
    await taskSettled(el);
    // Config error renders empty — no img shown despite auction returning a winner
    expect(el.querySelector("img")).toBeNull();
  });

  it("does not render banner when slotId attribute is missing", async () => {
    vi.mocked(runAuction).mockResolvedValue([makeBanner()]);
    const el = mount({ width: "300", height: "250" }); // no id
    await taskSettled(el);
    // slotId="" is falsy — config error, no img
    expect(el.querySelector("img")).toBeNull();
  });

  it("emits statechange with status 'ready' on success", async () => {
    vi.mocked(runAuction).mockResolvedValue([makeBanner()]);
    const el = mount({ id: "slot-1", width: "300", height: "250" });
    const events: CustomEvent[] = [];
    el.addEventListener("statechange", (e) => events.push(e as CustomEvent));
    await taskSettled(el);
    const ready = events.find((e) => e.detail.status === "ready");
    expect(ready).toBeDefined();
    expect(ready?.detail.slotId).toBe("slot-1");
  });

  it("emits statechange with status 'nowinners' on empty winners", async () => {
    vi.mocked(runAuction).mockResolvedValue([]);
    const el = mount({ id: "slot-1", width: "300", height: "250" });
    const events: CustomEvent[] = [];
    el.addEventListener("statechange", (e) => events.push(e as CustomEvent));
    await taskSettled(el);
    expect(events.some((e) => e.detail.status === "nowinners")).toBe(true);
  });

  it("emits statechange with status 'error' on auction failure (predefined mode)", async () => {
    vi.mocked(runAuction).mockRejectedValue(new Error("fail"));
    const el = mount({ id: "slot-1", predefined: "" });
    const events: CustomEvent[] = [];
    el.addEventListener("statechange", (e) => events.push(e as CustomEvent));
    await taskSettled(el);
    expect(events.some((e) => e.detail.status === "error")).toBe(true);
  });

  it("sets --ts-banner-width and --ts-banner-height CSS custom properties", async () => {
    vi.mocked(runAuction).mockResolvedValue([makeBanner()]);
    const el = mount({ id: "slot-1", width: "300", height: "250" });
    await taskSettled(el);
    const htmlEl = el as HTMLElement;
    expect(htmlEl.style.getPropertyValue("--ts-banner-width")).toBe("300px");
    expect(htmlEl.style.getPropertyValue("--ts-banner-height")).toBe("250px");
  });

  it("predefined mode: applies template and emits 'ready'", async () => {
    const winner = makeBanner({ asset: [{ url: "x", content: { label: "Hello" } }] });
    vi.mocked(runAuction).mockResolvedValue([winner]);
    const el = mount({ id: "slot-1", predefined: "" });
    el.innerHTML = '<span data-ts-field="label">old</span>';
    const events: CustomEvent[] = [];
    el.addEventListener("statechange", (e) => events.push(e as CustomEvent));
    await taskSettled(el);
    expect(el.querySelector("span")?.textContent).toBe("Hello");
    expect(events.some((e) => e.detail.status === "ready")).toBe(true);
  });

  it("predefined mode: transition detection prevents double-application of template", async () => {
    const winner = makeBanner({ asset: [{ url: "x", content: { label: "Hello" } }] });
    vi.mocked(runAuction).mockResolvedValue([winner]);
    const el = mount({ id: "slot-1", predefined: "" });
    el.innerHTML = '<span data-ts-field="label">old</span>';
    const events: CustomEvent[] = [];
    el.addEventListener("statechange", (e) => events.push(e as CustomEvent));
    await taskSettled(el);
    // Force an additional update cycle — template and event must only fire once
    (el as LitElement).requestUpdate();
    await (el as LitElement).updateComplete;
    const readyEvents = events.filter((e) => e.detail.status === "ready");
    expect(readyEvents.length).toBe(1);
  });

  it("predefined mode: emits ready even if applyTemplate throws", async () => {
    const winner = makeBanner({ asset: [{ url: "x", content: { label: "Hello" } }] });
    vi.mocked(runAuction).mockResolvedValue([winner]);
    vi.spyOn(templateModule, "applyTemplate").mockImplementationOnce(() => {
      throw new Error("DOM error");
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const el = mount({ id: "slot-1", predefined: "" });
    el.innerHTML = '<span data-ts-field="label">old</span>';
    const events: CustomEvent[] = [];
    el.addEventListener("statechange", (e) => events.push(e as CustomEvent));
    await taskSettled(el);
    const readyEvents = events.filter((e) => e.detail.status === "ready");
    expect(readyEvents.length).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
    vi.restoreAllMocks();
  });

  it("predefined mode: winner with no content map leaves template unchanged and warns", async () => {
    const winner = makeBanner(); // asset has no content field
    vi.mocked(runAuction).mockResolvedValue([winner]);
    const warnSpy = vi.spyOn(console, "warn");
    const el = mount({ id: "slot-1", predefined: "" });
    await taskSettled(el);
    // No image banner rendered — template stays unchanged
    expect(el.querySelector("img")).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("no content map"));
  });

  it("standard mode: transition detection prevents double-emission of ready", async () => {
    vi.mocked(runAuction).mockResolvedValue([makeBanner()]);
    const el = mount({ id: "slot-1", width: "300", height: "250" });
    const events: CustomEvent[] = [];
    el.addEventListener("statechange", (e) => events.push(e as CustomEvent));
    await taskSettled(el);
    // Trigger re-render by changing a property — must NOT re-emit ready
    el.setAttribute("width", "400");
    await (el as LitElement).updateComplete;
    const readyEvents = events.filter((e) => e.detail.status === "ready");
    expect(readyEvents.length).toBe(1);
  });

  it("emits statechange with status 'error' on auction failure (standard mode)", async () => {
    vi.mocked(runAuction).mockRejectedValue(new Error("network error"));
    const el = mount({ id: "slot-1", width: "300", height: "250" });
    const events: CustomEvent[] = [];
    el.addEventListener("statechange", (e) => events.push(e as CustomEvent));
    await taskSettled(el);
    expect(events.some((e) => e.detail.status === "error")).toBe(true);
  });

  describe("context mode", () => {
    function mountContext(parentAttrs: Record<string, string>): {
      banner: Element;
      slot1: Element;
      slot2: Element;
    } {
      const banner = document.createElement("topsort-banner");
      for (const [k, v] of Object.entries(parentAttrs)) banner.setAttribute(k, v);
      banner.setAttribute("context", "");
      const slot1 = document.createElement("topsort-banner-slot");
      slot1.setAttribute("rank", "1");
      const slot2 = document.createElement("topsort-banner-slot");
      slot2.setAttribute("rank", "2");
      banner.appendChild(slot1);
      banner.appendChild(slot2);
      document.body.appendChild(banner);
      return { banner, slot1, slot2 };
    }

    async function contextSettled(banner: Element, slot1: Element, slot2: Element): Promise<void> {
      await taskSettled(banner);
      await (slot1 as LitElement).updateComplete;
      await (slot2 as LitElement).updateComplete;
    }

    it("propagates width and height from parent to slot-rendered banner images", async () => {
      vi.mocked(runAuction).mockResolvedValue([makeBanner(), makeBanner({ id: "b2" })]);
      const { banner, slot1, slot2 } = mountContext({ id: "slot-1", width: "300", height: "90" });
      await contextSettled(banner, slot1, slot2);
      const img1 = slot1.querySelector("img");
      const img2 = slot2.querySelector("img");
      expect(img1?.getAttribute("style")).toContain("width:300px");
      expect(img1?.getAttribute("style")).toContain("height:90px");
      expect(img2?.getAttribute("style")).toContain("width:300px");
      expect(img2?.getAttribute("style")).toContain("height:90px");
    });

    it("preserves banner content in slots when parent width/height attribute changes after auction", async () => {
      vi.mocked(runAuction).mockResolvedValue([makeBanner(), makeBanner({ id: "b2" })]);
      const { banner, slot1, slot2 } = mountContext({ id: "slot-1", width: "300", height: "90" });
      await contextSettled(banner, slot1, slot2);
      // Banners rendered before the attribute change
      expect(slot1.querySelector("img")).not.toBeNull();
      expect(slot2.querySelector("img")).not.toBeNull();
      // Change width after the auction has already returned banners
      banner.setAttribute("width", "400");
      await contextSettled(banner, slot1, slot2);
      // Banners must still be visible — the context update must not wipe banners
      expect(slot1.querySelector("img")).not.toBeNull();
      expect(slot2.querySelector("img")).not.toBeNull();
      expect(slot1.querySelector("img")?.getAttribute("style")).toContain("width:400px");
    });
  });
});
