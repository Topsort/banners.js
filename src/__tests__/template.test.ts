import { beforeEach, describe, expect, it, vi } from "vitest";
import { _resetDeprecationWarning, applyTemplate } from "../template";
import type { Banner } from "../types";

function makeContainer(html: string): Element {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div;
}

function makeBanner(overrides: Partial<Banner> = {}): Banner {
  return {
    type: "url",
    id: "b1",
    resolvedBidId: "bid-123",
    asset: [{ url: "https://example.com/img.png" }],
    isFallback: false,
    ...overrides,
  };
}

describe("applyTemplate", () => {
  beforeEach(() => {
    _resetDeprecationWarning();
  });

  describe("legacy implicit binding (bare key)", () => {
    it("sets href on <a> element", () => {
      const container = makeContainer('<a data-ts-field="url">click</a>');
      const banner = makeBanner({
        asset: [{ url: "x", content: { url: "https://example.com" } }],
      });
      applyTemplate(container, banner);
      expect(container.querySelector("a")?.getAttribute("href")).toBe("https://example.com");
    });

    it("sets src on <img> element", () => {
      const container = makeContainer('<img data-ts-field="image" />');
      const banner = makeBanner({
        asset: [{ url: "x", content: { image: "https://img.example.com/photo.jpg" } }],
      });
      applyTemplate(container, banner);
      expect(container.querySelector("img")?.getAttribute("src")).toBe(
        "https://img.example.com/photo.jpg",
      );
    });

    it("sets src on <video> element", () => {
      const container = makeContainer('<video data-ts-field="video"></video>');
      const banner = makeBanner({
        asset: [{ url: "x", content: { video: "https://cdn.example.com/ad.mp4" } }],
      });
      applyTemplate(container, banner);
      expect(container.querySelector("video")?.getAttribute("src")).toBe(
        "https://cdn.example.com/ad.mp4",
      );
    });

    it("sets src on <source> element", () => {
      const container = makeContainer('<source data-ts-field="src" />');
      const banner = makeBanner({
        asset: [{ url: "x", content: { src: "https://cdn.example.com/ad.mp4" } }],
      });
      applyTemplate(container, banner);
      expect(container.querySelector("source")?.getAttribute("src")).toBe(
        "https://cdn.example.com/ad.mp4",
      );
    });

    it("sets textContent on generic element", () => {
      const container = makeContainer('<span data-ts-field="label">old</span>');
      const banner = makeBanner({ asset: [{ url: "x", content: { label: "New Product" } }] });
      applyTemplate(container, banner);
      expect(container.querySelector("span")?.textContent).toBe("New Product");
    });

    it("data-ts-attr override sets named attribute instead of default", () => {
      const container = makeContainer(
        '<span data-ts-field="label" data-ts-attr="title">old</span>',
      );
      const banner = makeBanner({ asset: [{ url: "x", content: { label: "Overridden" } }] });
      applyTemplate(container, banner);
      const el = container.querySelector("span");
      expect(el?.getAttribute("title")).toBe("Overridden");
      expect(el?.textContent).toBe("old");
    });

    it("logs deprecation warning for bare-key usage", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const container = makeContainer('<span data-ts-field="label">old</span>');
      const banner = makeBanner({ asset: [{ url: "x", content: { label: "text" } }] });
      applyTemplate(container, banner);
      expect(warnSpy).toHaveBeenCalledOnce();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Implicit data-ts-field binding is deprecated"),
      );
      warnSpy.mockRestore();
    });

    it("logs deprecation warning only once across multiple calls", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const banner = makeBanner({ asset: [{ url: "x", content: { label: "text" } }] });
      applyTemplate(makeContainer('<span data-ts-field="label">a</span>'), banner);
      applyTemplate(makeContainer('<span data-ts-field="label">b</span>'), banner);
      expect(warnSpy).toHaveBeenCalledOnce();
      warnSpy.mockRestore();
    });
  });

  describe("explicit binding (key:target)", () => {
    it("sets src on <img> via explicit binding", () => {
      const container = makeContainer('<img data-ts-field="mainImage:src" />');
      const banner = makeBanner({
        asset: [{ url: "x", content: { mainImage: "https://img.example.com/photo.jpg" } }],
      });
      applyTemplate(container, banner);
      expect(container.querySelector("img")?.getAttribute("src")).toBe(
        "https://img.example.com/photo.jpg",
      );
    });

    it("sets href on <a> via explicit binding", () => {
      const container = makeContainer('<a data-ts-field="target:href">click</a>');
      const banner = makeBanner({
        asset: [{ url: "x", content: { target: "https://example.com" } }],
      });
      applyTemplate(container, banner);
      expect(container.querySelector("a")?.getAttribute("href")).toBe("https://example.com");
    });

    it("sets textContent via explicit binding", () => {
      const container = makeContainer('<span data-ts-field="headline:textContent">Default</span>');
      const banner = makeBanner({
        asset: [{ url: "x", content: { headline: "New Headline" } }],
      });
      applyTemplate(container, banner);
      expect(container.querySelector("span")?.textContent).toBe("New Headline");
    });

    it("sets arbitrary attribute via explicit binding", () => {
      const container = makeContainer('<span data-ts-field="label:title">text</span>');
      const banner = makeBanner({ asset: [{ url: "x", content: { label: "Tooltip" } }] });
      applyTemplate(container, banner);
      const el = container.querySelector("span");
      expect(el?.getAttribute("title")).toBe("Tooltip");
      expect(el?.textContent).toBe("text");
    });

    it("does not log deprecation warning for explicit bindings", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const container = makeContainer('<img data-ts-field="mainImage:src" />');
      const banner = makeBanner({
        asset: [{ url: "x", content: { mainImage: "https://example.com/img.png" } }],
      });
      applyTemplate(container, banner);
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe("multiple bindings (comma-separated)", () => {
    it("sets multiple attributes on one element", () => {
      const container = makeContainer(
        '<img data-ts-field="mainImage:src, altText:alt" src="" alt="" />',
      );
      const banner = makeBanner({
        asset: [
          {
            url: "x",
            content: { mainImage: "https://img.example.com/photo.jpg", altText: "A cool product" },
          },
        ],
      });
      applyTemplate(container, banner);
      const img = container.querySelector("img");
      expect(img?.getAttribute("src")).toBe("https://img.example.com/photo.jpg");
      expect(img?.getAttribute("alt")).toBe("A cool product");
    });

    it("applies only matching keys when content is partial", () => {
      const container = makeContainer(
        '<img data-ts-field="mainImage:src, altText:alt" src="default.jpg" alt="default alt" />',
      );
      const banner = makeBanner({
        asset: [{ url: "x", content: { mainImage: "https://img.example.com/photo.jpg" } }],
      });
      applyTemplate(container, banner);
      const img = container.querySelector("img");
      expect(img?.getAttribute("src")).toBe("https://img.example.com/photo.jpg");
      expect(img?.getAttribute("alt")).toBe("default alt");
    });

    it("mixed bare + explicit: bare key uses tag inference, data-ts-attr ignored", () => {
      const container = makeContainer(
        '<img data-ts-field="imageUrl, altText:alt" data-ts-attr="data-custom" src="" alt="" />',
      );
      const banner = makeBanner({
        asset: [
          {
            url: "x",
            content: { imageUrl: "https://example.com/img.png", altText: "Product photo" },
          },
        ],
      });
      applyTemplate(container, banner);
      const img = container.querySelector("img");
      // bare key "imageUrl" resolves via tag inference (img → src)
      expect(img?.getAttribute("src")).toBe("https://example.com/img.png");
      // explicit key "altText:alt" sets alt
      expect(img?.getAttribute("alt")).toBe("Product photo");
      // data-ts-attr is ignored because the element has explicit bindings
      expect(img?.hasAttribute("data-custom")).toBe(false);
    });

    it("ignores data-ts-attr when explicit bindings are used", () => {
      const container = makeContainer(
        '<img data-ts-field="mainImage:src" data-ts-attr="data-custom" />',
      );
      const banner = makeBanner({
        asset: [{ url: "x", content: { mainImage: "https://example.com/img.png" } }],
      });
      applyTemplate(container, banner);
      const img = container.querySelector("img");
      expect(img?.getAttribute("src")).toBe("https://example.com/img.png");
      expect(img?.hasAttribute("data-custom")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("trims whitespace around bindings", () => {
      const container = makeContainer(
        '<img data-ts-field="  mainImage:src  ,  altText:alt  " src="" alt="" />',
      );
      const banner = makeBanner({
        asset: [
          {
            url: "x",
            content: { mainImage: "https://example.com/img.png", altText: "Alt text" },
          },
        ],
      });
      applyTemplate(container, banner);
      const img = container.querySelector("img");
      expect(img?.getAttribute("src")).toBe("https://example.com/img.png");
      expect(img?.getAttribute("alt")).toBe("Alt text");
    });

    it("skips empty parts from trailing comma", () => {
      const container = makeContainer('<img data-ts-field="mainImage:src," src="" />');
      const banner = makeBanner({
        asset: [{ url: "x", content: { mainImage: "https://example.com/img.png" } }],
      });
      applyTemplate(container, banner);
      expect(container.querySelector("img")?.getAttribute("src")).toBe(
        "https://example.com/img.png",
      );
    });

    it("unknown field key leaves element untouched", () => {
      const container = makeContainer('<span data-ts-field="unknown">original</span>');
      const banner = makeBanner({ asset: [{ url: "x", content: { label: "something" } }] });
      applyTemplate(container, banner);
      expect(container.querySelector("span")?.textContent).toBe("original");
    });

    it("no content in banner leaves fields untouched", () => {
      const container = makeContainer('<span data-ts-field="label">original</span><div></div>');
      const banner = makeBanner({ asset: [{ url: "x" }] });
      applyTemplate(container, banner);
      expect(container.querySelector("span")?.textContent).toBe("original");
    });
  });

  describe("telemetry attributes", () => {
    it("sets data-ts-clickable on explicit [data-ts-clickable] element", () => {
      const container = makeContainer('<div><a data-ts-clickable href="#">link</a></div>');
      const banner = makeBanner({ asset: [{ url: "x" }] });
      applyTemplate(container, banner);
      expect(container.querySelector("[data-ts-clickable]")).not.toBeNull();
    });

    it("falls back to firstElementChild when no [data-ts-clickable]", () => {
      const container = makeContainer('<a href="#">link</a><span>other</span>');
      const banner = makeBanner({ asset: [{ url: "x" }] });
      applyTemplate(container, banner);
      expect(container.querySelector("a")?.hasAttribute("data-ts-clickable")).toBe(true);
      expect(container.querySelector("span")?.hasAttribute("data-ts-clickable")).toBe(false);
    });

    it("sets data-ts-resolved-bid when banner is not a fallback", () => {
      const container = makeContainer('<a href="#">link</a>');
      const banner = makeBanner({ isFallback: false });
      applyTemplate(container, banner);
      expect(container.querySelector("a")?.getAttribute("data-ts-resolved-bid")).toBe("bid-123");
    });

    it("does not set data-ts-resolved-bid when banner is a fallback", () => {
      const container = makeContainer('<a href="#">link</a>');
      const banner = makeBanner({ isFallback: true });
      applyTemplate(container, banner);
      expect(container.querySelector("a")?.hasAttribute("data-ts-resolved-bid")).toBe(false);
    });
  });

  it("does not apply any sizing or layout styles — merchant controls template appearance", () => {
    const container = makeContainer(
      '<div data-ts-clickable><img data-ts-field="imageUrl:src" src="" style="width:300px;height:250px;" /></div>',
    );
    const banner = makeBanner({
      asset: [
        {
          url: "https://example.com/img.png",
          content: { imageUrl: "https://example.com/img.png" },
        },
      ],
    });
    const styleBefore = container.querySelector("img")?.getAttribute("style");

    applyTemplate(container, banner);

    expect(container.querySelector("img")?.getAttribute("style")).toBe(styleBefore);
  });
});
