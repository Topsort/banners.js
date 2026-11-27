import type { LitElement } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../auction", () => ({
  runAuction: vi.fn(),
  getDeviceType: vi.fn().mockReturnValue("desktop"),
}));

import "../index";
import { runAuction } from "../auction";

async function mountSlot(): Promise<Element> {
  const parent = document.createElement("topsort-banner");
  parent.setAttribute("id", "slot-1");
  parent.setAttribute("context", "");
  const slot = document.createElement("topsort-banner-slot");
  slot.setAttribute("rank", "1");
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

describe("<topsort-banner-slot> when the context auction fails", () => {
  // Regression: render() checked `banners` before `error`, so a failed auction left
  // every slot on the loading element and getErrorElement never ran.
  it("renders getErrorElement with the error instead of the loading element", async () => {
    const error = new Error("auction failed");
    const getErrorElement = vi.fn(() => {
      const el = document.createElement("div");
      el.setAttribute("data-hook", "error");
      return el;
    });
    const getLoadingElement = vi.fn(() => {
      const el = document.createElement("div");
      el.setAttribute("data-hook", "loading");
      return el;
    });
    window.TS_BANNERS = {
      getErrorElement,
      getLoadingElement,
    } as unknown as typeof window.TS_BANNERS;
    vi.mocked(runAuction).mockRejectedValue(error);
    const slot = await mountSlot();
    expect(getErrorElement).toHaveBeenCalledWith(error);
    expect(slot.querySelectorAll("[data-hook]")).toHaveLength(1);
    expect(slot.querySelector('[data-hook="error"]')).not.toBeNull();
  });

  it("renders nothing when no getErrorElement hook is set", async () => {
    window.TS_BANNERS = {} as typeof window.TS_BANNERS;
    vi.mocked(runAuction).mockRejectedValue(new Error("auction failed"));
    const slot = await mountSlot();
    expect(slot.children).toHaveLength(0);
  });
});
