import type { LitElement } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HlsConstructor } from "../types";

import "../index";

// Shared mock Hls instance — its methods are cleared between tests via vi.clearAllMocks()
const mockHlsInstance = {
  loadSource: vi.fn(),
  attachMedia: vi.fn(),
  on: vi.fn(),
  destroy: vi.fn(),
};

// Construct a mock Hls constructor with an Events map.
// Must be a regular function (not arrow) so `new MockHls()` works as a constructor.
// biome-ignore lint/suspicious/noExplicitAny: test helper needs `any` for constructor return
const MockHls = vi.fn(function MockHlsCtor(this: any) {
  return mockHlsInstance;
});
(MockHls as unknown as HlsConstructor).Events = {
  MANIFEST_PARSED: "hlsManifestParsed",
};

function mount(attrs: Record<string, string> = {}): Element {
  const el = document.createElement("hls-video");
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

/** Wait for the element to update and for async firstUpdated to complete. */
async function firstUpdatedComplete(el: Element): Promise<void> {
  await (el as LitElement).updateComplete;
  // One microtask tick lets hlsDependency.load() (Promise.resolve) resolve
  // and the synchronous body of firstUpdated (loadSource, attachMedia, on) run.
  await Promise.resolve();
}

beforeEach(() => {
  // Make window.Hls available so HlsDependency.load() short-circuits (no CDN script).
  vi.stubGlobal("Hls", MockHls);
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("HlsVideo", () => {
  it("renders a <video> element inside shadow DOM", async () => {
    const el = mount({ src: "https://cdn.example.com/vid/stream.m3u8" });
    await (el as LitElement).updateComplete;
    const video = el.shadowRoot?.querySelector("video");
    expect(video).not.toBeNull();
  });

  it("videoId is the first pathname segment extracted from a valid URL", async () => {
    // pathname = /vid/stream.m3u8 → split("/") = ["", "vid", "stream.m3u8"] → [1] = "vid"
    const el = mount({ src: "https://cdn.example.com/vid/stream.m3u8" });
    await (el as LitElement).updateComplete;
    const video = el.shadowRoot?.querySelector("video");
    expect(video?.id).toBe("vid");
  });

  it("videoId falls back to 'hls-video' when src URL is malformed", async () => {
    const el = mount({ src: "not-a-valid-url" });
    await (el as LitElement).updateComplete;
    const video = el.shadowRoot?.querySelector("video");
    expect(video?.id).toBe("hls-video");
  });

  it("calls hls.loadSource(src) after mount", async () => {
    const src = "https://cdn.example.com/vid/stream.m3u8";
    const el = mount({ src });
    await firstUpdatedComplete(el);
    expect(mockHlsInstance.loadSource).toHaveBeenCalledWith(src);
  });

  it("calls hls.attachMedia(videoEl) after mount", async () => {
    const el = mount({ src: "https://cdn.example.com/vid/stream.m3u8" });
    await firstUpdatedComplete(el);
    const video = el.shadowRoot?.querySelector("video");
    expect(mockHlsInstance.attachMedia).toHaveBeenCalledWith(video);
  });

  it("skips CDN script injection when window.Hls is already set", async () => {
    const el = mount({ src: "https://cdn.example.com/vid/stream.m3u8" });
    await firstUpdatedComplete(el);
    // No <script> pointing to hls CDN should exist
    const hlsScripts = document.head.querySelectorAll('script[src*="hls"]');
    expect(hlsScripts.length).toBe(0);
  });

  it("triggers video.play() when MANIFEST_PARSED event fires", async () => {
    const playSpy = vi.spyOn(HTMLVideoElement.prototype, "play").mockResolvedValue(undefined);

    // Capture the MANIFEST_PARSED callback registered via hls.on(...)
    let manifestCallback: (() => void) | undefined;
    mockHlsInstance.on.mockImplementation((event: string, cb: () => void) => {
      if (event === (MockHls as unknown as HlsConstructor).Events.MANIFEST_PARSED) {
        manifestCallback = cb;
      }
    });

    const el = mount({ src: "https://cdn.example.com/vid/stream.m3u8" });
    await firstUpdatedComplete(el);

    expect(manifestCallback).toBeDefined();
    manifestCallback?.();

    expect(playSpy).toHaveBeenCalled();
  });
});
