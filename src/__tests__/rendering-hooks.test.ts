import type { LitElement } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Banner } from "../types";

vi.mock("../auction", () => ({
  runAuction: vi.fn(),
  getDeviceType: vi.fn().mockReturnValue("desktop"),
}));

import "../index";
import { runAuction } from "../auction";

const banner: Banner = {
  type: "url",
  id: "b1",
  resolvedBidId: "bid-1",
  asset: [{ url: "https://example.com/banner.jpg" }],
  isFallback: false,
};

function hookElement(name: string): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("data-hook", name);
  return el;
}

async function mount(): Promise<Element> {
  const el = document.createElement("topsort-banner");
  el.setAttribute("id", "slot-1");
  document.body.appendChild(el);
  const lit = el as LitElement;
  await lit.updateComplete;
  await new Promise<void>((r) => setTimeout(r, 0));
  await lit.updateComplete;
  return el;
}

let original: typeof window.TS_BANNERS;

beforeEach(() => {
  original = window.TS_BANNERS;
  Object.defineProperty(window, "TS", {
    value: { token: "test-token" },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  window.TS_BANNERS = original;
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("TS_BANNERS rendering hooks", () => {
  it("renders getLoadingElement while the auction is pending", async () => {
    const getLoadingElement = vi.fn(() => hookElement("loading"));
    window.TS_BANNERS = { getLoadingElement } as unknown as typeof window.TS_BANNERS;
    vi.mocked(runAuction).mockReturnValue(new Promise(() => {}));
    const el = await mount();
    expect(getLoadingElement).toHaveBeenCalled();
    expect(el.querySelectorAll("[data-hook]")).toHaveLength(1);
    expect(el.querySelector('[data-hook="loading"]')).not.toBeNull();
  });

  it("renders getErrorElement with the error when the auction rejects", async () => {
    const error = new Error("auction failed");
    const getErrorElement = vi.fn(() => hookElement("error"));
    window.TS_BANNERS = { getErrorElement } as unknown as typeof window.TS_BANNERS;
    vi.mocked(runAuction).mockRejectedValue(error);
    const el = await mount();
    expect(getErrorElement).toHaveBeenCalledWith(error);
    expect(el.querySelectorAll("[data-hook]")).toHaveLength(1);
    expect(el.querySelector('[data-hook="error"]')).not.toBeNull();
  });

  it("renders getNoWinnersElement when there are no winners", async () => {
    const getNoWinnersElement = vi.fn(() => hookElement("no-winners"));
    window.TS_BANNERS = { getNoWinnersElement } as unknown as typeof window.TS_BANNERS;
    vi.mocked(runAuction).mockResolvedValue([]);
    const el = await mount();
    expect(getNoWinnersElement).toHaveBeenCalled();
    expect(el.querySelectorAll("[data-hook]")).toHaveLength(1);
    expect(el.querySelector('[data-hook="no-winners"]')).not.toBeNull();
  });

  it("renders getBannerElement with the winning banner instead of the default", async () => {
    const getBannerElement = vi.fn(() => hookElement("banner"));
    window.TS_BANNERS = { getBannerElement } as unknown as typeof window.TS_BANNERS;
    vi.mocked(runAuction).mockResolvedValue([banner]);
    const el = await mount();
    expect(getBannerElement).toHaveBeenCalledWith(banner);
    expect(el.querySelectorAll("[data-hook]")).toHaveLength(1);
    expect(el.querySelector('[data-hook="banner"]')).not.toBeNull();
    expect(el.querySelector("img")).toBeNull();
    expect(el.querySelector(".ts-banner")).toBeNull();
  });

  it("uses the default rendering when no rendering hooks are set", async () => {
    window.TS_BANNERS = {} as typeof window.TS_BANNERS;

    vi.mocked(runAuction).mockReturnValue(new Promise(() => {}));
    let el = await mount();
    expect(el.children).toHaveLength(0);
    document.body.innerHTML = "";

    vi.mocked(runAuction).mockRejectedValue(new Error("boom"));
    el = await mount();
    expect(el.children).toHaveLength(0);
    document.body.innerHTML = "";

    vi.mocked(runAuction).mockResolvedValue([]);
    el = await mount();
    expect(el.children).toHaveLength(0);
    document.body.innerHTML = "";

    vi.mocked(runAuction).mockResolvedValue([banner]);
    el = await mount();
    expect(el.querySelector(".ts-banner img")?.getAttribute("src")).toBe(
      "https://example.com/banner.jpg",
    );
  });

  describe("on <topsort-banner-slot> under a context parent", () => {
    async function mountSlot(rank: number): Promise<Element> {
      const parent = document.createElement("topsort-banner");
      parent.setAttribute("id", "slot-1");
      parent.setAttribute("context", "");
      const slot = document.createElement("topsort-banner-slot");
      slot.setAttribute("rank", String(rank));
      parent.appendChild(slot);
      document.body.appendChild(parent);
      await (parent as LitElement).updateComplete;
      await new Promise<void>((r) => setTimeout(r, 0));
      await (parent as LitElement).updateComplete;
      await (slot as LitElement).updateComplete;
      await new Promise<void>((r) => setTimeout(r, 0));
      await (slot as LitElement).updateComplete;
      return slot;
    }

    it("renders getLoadingElement while the auction is pending", async () => {
      const getLoadingElement = vi.fn(() => hookElement("loading"));
      window.TS_BANNERS = { getLoadingElement } as unknown as typeof window.TS_BANNERS;
      vi.mocked(runAuction).mockReturnValue(new Promise(() => {}));
      const slot = await mountSlot(1);
      expect(getLoadingElement).toHaveBeenCalled();
      expect(slot.querySelectorAll("[data-hook]")).toHaveLength(1);
      expect(slot.querySelector('[data-hook="loading"]')).not.toBeNull();
    });

    it("renders getNoWinnersElement when the rank is beyond the winners", async () => {
      const getNoWinnersElement = vi.fn(() => hookElement("no-winners"));
      window.TS_BANNERS = { getNoWinnersElement } as unknown as typeof window.TS_BANNERS;
      vi.mocked(runAuction).mockResolvedValue([banner]);
      const slot = await mountSlot(2);
      expect(getNoWinnersElement).toHaveBeenCalled();
      expect(slot.querySelectorAll("[data-hook]")).toHaveLength(1);
      expect(slot.querySelector('[data-hook="no-winners"]')).not.toBeNull();
    });

    it("renders getBannerElement with the winner at its rank instead of the default", async () => {
      const second: Banner = { ...banner, id: "b2", resolvedBidId: "bid-2" };
      const getBannerElement = vi.fn(() => hookElement("banner"));
      window.TS_BANNERS = { getBannerElement } as unknown as typeof window.TS_BANNERS;
      vi.mocked(runAuction).mockResolvedValue([banner, second]);
      const slot = await mountSlot(2);
      expect(getBannerElement).toHaveBeenCalledWith(second);
      expect(slot.querySelectorAll("[data-hook]")).toHaveLength(1);
      expect(slot.querySelector('[data-hook="banner"]')).not.toBeNull();
      expect(slot.querySelector("img")).toBeNull();
      expect(slot.querySelector(".ts-banner")).toBeNull();
    });
  });
});
