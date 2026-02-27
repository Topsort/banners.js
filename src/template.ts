import type { Banner } from "./types";

function setFieldValue(el: Element, value: string, attrOverride?: string) {
  if (attrOverride) {
    el.setAttribute(attrOverride, value);
    return;
  }
  const tag = el.tagName.toLowerCase();
  if (tag === "a") {
    el.setAttribute("href", value);
  } else if (tag === "img" || tag === "video" || tag === "source") {
    el.setAttribute("src", value);
  } else {
    el.textContent = value;
  }
}

export function applyTemplate(container: Element, banner: Banner) {
  const content = banner.asset?.[0]?.content;

  if (content) {
    const fields = container.querySelectorAll<HTMLElement>("[data-ts-field]");
    for (const el of fields) {
      const key = el.dataset.tsField;
      if (key && key in content) {
        setFieldValue(el, content[key], el.dataset.tsAttr);
      }
    }
  }

  const wrapper = container.querySelector("[data-ts-clickable]") || container.firstElementChild;
  if (wrapper) {
    wrapper.setAttribute("data-ts-clickable", "");
    if (!banner.isFallback) {
      wrapper.setAttribute("data-ts-resolved-bid", banner.resolvedBidId);
    }
  }
}
