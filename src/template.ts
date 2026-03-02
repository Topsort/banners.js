import type { Banner } from "./types";

interface Binding {
  key: string;
  target: string | null;
}

let deprecationWarned = false;

function parseBindings(raw: string): Binding[] {
  const bindings: Binding[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) {
      bindings.push({ key: trimmed, target: null });
    } else {
      bindings.push({ key: trimmed.slice(0, colonIdx), target: trimmed.slice(colonIdx + 1) });
    }
  }
  return bindings;
}

function setFieldValue(el: Element, value: string, target: string | null) {
  if (target === "textContent") {
    el.textContent = value;
    return;
  }
  if (target) {
    el.setAttribute(target, value);
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

/**
 * Mutates `container` in place with auction data from `banner`.
 *
 * Intentionally does not apply any sizing or layout styles — predefined mode
 * gives the merchant full control over the template's appearance. Only content
 * fields (`data-ts-field`) and telemetry attributes are written.
 */
export function applyTemplate(container: Element, banner: Banner) {
  const content = banner.asset?.[0]?.content;

  if (content) {
    const fields = container.querySelectorAll<HTMLElement>("[data-ts-field]");
    for (const el of fields) {
      const raw = el.dataset.tsField;
      if (!raw) continue;

      const bindings = parseBindings(raw);
      const isExplicit = bindings.some((b) => b.target !== null);

      for (const { key, target } of bindings) {
        if (!(key in content)) continue;

        if (!isExplicit && target === null) {
          // Bare key — check data-ts-attr override for backwards compat
          const attrOverride = el.dataset.tsAttr;
          if (!deprecationWarned) {
            deprecationWarned = true;
            console.warn(
              '[banners.js] Implicit data-ts-field binding is deprecated. Use explicit "key:target" syntax instead (e.g. data-ts-field="image:src").',
            );
          }
          setFieldValue(el, content[key], attrOverride ?? null);
        } else {
          setFieldValue(el, content[key], target);
        }
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

/** @internal — exposed for testing only */
export function _resetDeprecationWarning() {
  deprecationWarned = false;
}
