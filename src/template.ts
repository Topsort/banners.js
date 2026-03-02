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

function resolveTarget(el: Element, target: string | null): string {
  if (target) return target;
  const tag = el.tagName.toLowerCase();
  if (tag === "a") return "href";
  if (tag === "img" || tag === "video" || tag === "source") return "src";
  return "textContent";
}

/**
 * Sets a value on `el`. Returns `false` when the resolved target is an
 * attribute that does not already exist on the element (binding skipped).
 */
function setFieldValue(el: Element, value: string, target: string): boolean {
  if (target === "textContent") {
    el.textContent = value;
    return true;
  }
  if (!el.hasAttribute(target)) {
    return false;
  }
  el.setAttribute(target, value);
  return true;
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

        let resolved: string;
        if (!isExplicit && target === null) {
          // Bare key — check data-ts-attr override for backwards compat
          const attrOverride = el.dataset.tsAttr;
          if (!deprecationWarned) {
            deprecationWarned = true;
            console.warn(
              '[banners.js] Implicit data-ts-field binding is deprecated. Use explicit "key:target" syntax instead (e.g. data-ts-field="image:src").',
            );
          }
          resolved = resolveTarget(el, attrOverride ?? null);
        } else {
          resolved = resolveTarget(el, target);
        }

        if (!setFieldValue(el, content[key], resolved)) {
          const tag = el.tagName.toLowerCase();
          console.warn(
            `[banners.js] Binding "${key}" → "${resolved}" skipped: <${tag}> has no "${resolved}" attribute. Add a fallback value (e.g. ${resolved}="...") to your template.`,
          );
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
