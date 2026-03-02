import { describe, expect, it } from "vitest";
import { applyTemplate } from "../template";
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
  it("sets href on <a> element", () => {
    const container = makeContainer('<a data-ts-field="url">click</a>');
    const banner = makeBanner({ asset: [{ url: "x", content: { url: "https://example.com" } }] });
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
    const container = makeContainer('<span data-ts-field="label" data-ts-attr="title">old</span>');
    const banner = makeBanner({ asset: [{ url: "x", content: { label: "Overridden" } }] });
    applyTemplate(container, banner);
    const el = container.querySelector("span");
    expect(el?.getAttribute("title")).toBe("Overridden");
    expect(el?.textContent).toBe("old");
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

  it("does not apply any sizing or layout styles — merchant controls template appearance", () => {
    const container = makeContainer(
      '<div data-ts-clickable><img data-ts-field="imageUrl" src="" style="width:300px;height:250px;" /></div>',
    );
    const banner = makeBanner({
      asset: [{ url: "https://example.com/img.png", content: { imageUrl: "https://example.com/img.png" } }],
    });
    const imgBefore = container.querySelector("img")!;
    const styleBefore = imgBefore.getAttribute("style");

    applyTemplate(container, banner);

    const imgAfter = container.querySelector("img")!;
    expect(imgAfter.getAttribute("style")).toBe(styleBefore);
  });
});
