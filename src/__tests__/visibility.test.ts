import { afterEach, describe, expect, it, vi } from "vitest";
import { isRendered, whenVisible } from "../visibility";

describe("isRendered", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("uses Element.checkVisibility when available", () => {
    const el = document.createElement("div");
    const check = vi.fn().mockReturnValue(false);
    (el as unknown as { checkVisibility: unknown }).checkVisibility = check;
    expect(isRendered(el)).toBe(false);
    expect(check).toHaveBeenCalledWith({
      contentVisibilityAuto: true,
      opacityProperty: true,
      visibilityProperty: true,
    });
  });

  it("falls back to computed style when checkVisibility is unavailable", () => {
    // jsdom does not implement checkVisibility, so this exercises the fallback.
    const el = document.createElement("div");
    document.body.appendChild(el);
    expect(isRendered(el)).toBe(true);

    const hidden = document.createElement("div");
    hidden.style.visibility = "hidden";
    document.body.appendChild(hidden);
    expect(isRendered(hidden)).toBe(false);

    const transparent = document.createElement("div");
    transparent.style.opacity = "0";
    document.body.appendChild(transparent);
    expect(isRendered(transparent)).toBe(false);
  });

  it("returns false when an ancestor is opacity:0", () => {
    const parent = document.createElement("div");
    parent.style.opacity = "0";
    const child = document.createElement("div");
    parent.appendChild(child);
    document.body.appendChild(parent);
    expect(isRendered(child)).toBe(false);
  });
});

describe("whenVisible", () => {
  const OriginalIO = globalThis.IntersectionObserver;

  afterEach(() => {
    globalThis.IntersectionObserver = OriginalIO;
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("promotes immediately when IntersectionObserver is unavailable (legacy engines)", () => {
    // @ts-expect-error — simulate an engine without IntersectionObserver
    globalThis.IntersectionObserver = undefined;
    const el = document.createElement("div");
    const onVisible = vi.fn();
    whenVisible(el, onVisible);
    expect(onVisible).toHaveBeenCalledTimes(1);
  });

  it("does NOT promote a visibility:hidden element that is in the viewport", () => {
    // Fake IntersectionObserver that immediately reports the target as
    // intersecting — mirrors analytics.js's geometry-only observer.
    const observed: Element[] = [];
    class FakeIO {
      constructor(private cb: IntersectionObserverCallback) {}
      observe(target: Element) {
        observed.push(target);
        // Report intersecting synchronously, like a visible-in-viewport box.
        this.cb(
          [{ target, isIntersecting: true } as unknown as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    // @ts-expect-error — install fake
    globalThis.IntersectionObserver = FakeIO;

    const el = document.createElement("div");
    el.style.visibility = "hidden"; // in the viewport geometrically, but hidden
    document.body.appendChild(el);

    const onVisible = vi.fn();
    whenVisible(el, onVisible);

    // Geometrically intersecting, but not genuinely rendered → no promotion.
    expect(onVisible).not.toHaveBeenCalled();
  });

  it("promotes a genuinely visible element that intersects the viewport", () => {
    class FakeIO {
      constructor(private cb: IntersectionObserverCallback) {}
      observe(target: Element) {
        this.cb(
          [{ target, isIntersecting: true } as unknown as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    // @ts-expect-error — install fake
    globalThis.IntersectionObserver = FakeIO;

    const el = document.createElement("div");
    document.body.appendChild(el); // default styles → rendered
    const onVisible = vi.fn();
    whenVisible(el, onVisible);
    expect(onVisible).toHaveBeenCalledTimes(1);
  });
});
