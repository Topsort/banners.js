/**
 * Tests for the CDN script injection path of loadHls() (index.ts lines 440-451).
 *
 * This file must be separate from hls-video.test.ts so the module-scoped
 * _hlsLoadPromise cache starts fresh (Vitest runs each file in its own worker).
 * Tests are ordered carefully: error tests first (cache resets on rejection),
 * success test next, caching test last.
 */
import type { LitElement } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HlsConstructor } from "../types";

// Import registers custom elements in a fresh worker — _hlsLoadPromise is null.
import "../index";

const mockHlsInstance = {
  loadSource: vi.fn(),
  attachMedia: vi.fn(),
  on: vi.fn(),
  destroy: vi.fn(),
};

// biome-ignore lint/suspicious/noExplicitAny: test helper needs `any` for constructor return
const MockHls = vi.fn(function MockHlsCtor(this: any) {
  return mockHlsInstance;
});
(MockHls as unknown as HlsConstructor).Events = {
  MANIFEST_PARSED: "hlsManifestParsed",
};

function setWindowTS(token = "") {
  Object.defineProperty(window, "TS", {
    value: { token },
    writable: true,
    configurable: true,
  });
}

function mount(attrs: Record<string, string> = {}): Element {
  const el = document.createElement("hls-video");
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = "";
  // Remove any injected CDN scripts so subsequent tests can detect new ones
  for (const s of document.head.querySelectorAll('script[src*="hls"]')) s.remove();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("loadHls CDN script injection", () => {
  // --- error tests run first so _hlsLoadPromise resets via .catch ---

  it("logs error when CDN script onerror fires", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    setWindowTS("test-token");

    const el = mount({ src: "https://cdn.example.com/vid/stream.m3u8" });
    await (el as LitElement).updateComplete;

    const script = document.head.querySelector('script[src*="hls"]') as HTMLScriptElement;
    expect(script).not.toBeNull();

    // Fire onerror — rejects the promise, _hlsLoadPromise resets to null
    script.onerror?.(new Event("error"));

    // Let the promise chain + firstUpdated's catch settle
    await new Promise<void>((r) => setTimeout(r, 0));

    expect(errorSpy).toHaveBeenCalledWith("Failed to load HLS.js:", expect.any(Error));
    errorSpy.mockRestore();
  });

  it("logs error when CDN script loads but window.Hls is still missing", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    setWindowTS("test-token");

    const el = mount({ src: "https://cdn.example.com/vid/stream.m3u8" });
    await (el as LitElement).updateComplete;

    const script = document.head.querySelector('script[src*="hls"]') as HTMLScriptElement;
    expect(script).not.toBeNull();

    // Fire onload without setting window.Hls — rejects with "loaded but not available"
    script.onload?.(new Event("load"));

    await new Promise<void>((r) => setTimeout(r, 0));

    expect(errorSpy).toHaveBeenCalledWith("Failed to load HLS.js:", expect.any(Error));
    errorSpy.mockRestore();
  });

  // --- success test: sets _hlsLoadPromise permanently ---

  it("injects CDN script and initializes HLS on successful load", async () => {
    setWindowTS("test-token");

    const el = mount({ src: "https://cdn.example.com/vid/stream.m3u8" });
    await (el as LitElement).updateComplete;

    const script = document.head.querySelector('script[src*="hls"]') as HTMLScriptElement;
    expect(script).not.toBeNull();
    expect(script.src).toContain("hls.js");

    // Simulate the CDN script setting window.Hls, then fire onload
    vi.stubGlobal("Hls", MockHls);
    script.onload?.(new Event("load"));

    // Let promise + firstUpdated settle
    await new Promise<void>((r) => setTimeout(r, 0));

    expect(mockHlsInstance.loadSource).toHaveBeenCalledWith(
      "https://cdn.example.com/vid/stream.m3u8",
    );
    expect(mockHlsInstance.attachMedia).toHaveBeenCalled();
  });

  // --- caching test: must run after success (cache is set) ---

  it("does not inject a second script when _hlsLoadPromise is cached", async () => {
    setWindowTS("test-token");
    // Stub Hls so loadHls resolves from cache without needing a new script
    vi.stubGlobal("Hls", MockHls);

    const el = mount({ src: "https://cdn.example.com/vid/stream.m3u8" });
    await (el as LitElement).updateComplete;
    await new Promise<void>((r) => setTimeout(r, 0));

    // _hlsLoadPromise was set by the previous success test — no new script injected
    const scripts = document.head.querySelectorAll('script[src*="hls"]');
    expect(scripts.length).toBe(0);
  });
});
