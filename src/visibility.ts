/**
 * Real-visibility gate for impression telemetry.
 *
 * Background: impressions are fired by `@topsort/analytics.js`, which observes
 * `data-ts-resolved-bid` with an `IntersectionObserver` (threshold 0.5). That
 * observer is purely geometric — it treats `visibility:hidden` / `opacity:0`
 * elements as visible as long as their box overlaps the viewport, and only
 * respects `display:none`. Merchants that preload markup into a hidden
 * container (e.g. a mega-menu revealed on hover) therefore get phantom
 * impressions the moment the auction writes `data-ts-resolved-bid`.
 *
 * banners.js closes this gap by withholding `data-ts-resolved-bid` until the
 * element is *genuinely rendered* — not `display:none`, `visibility:hidden`,
 * `opacity:0`, or `content-visibility:hidden`. Viewport gating stays with
 * analytics.js; this module only answers "is it actually painted right now?".
 */

/**
 * True when `el` is genuinely rendered — accounts for display, visibility,
 * opacity and content-visibility on the element and its ancestors.
 */
export function isRendered(el: HTMLElement): boolean {
  const check = (el as unknown as { checkVisibility?: (opts?: unknown) => boolean })
    .checkVisibility;
  if (typeof check === "function") {
    return check.call(el, {
      contentVisibilityAuto: true,
      opacityProperty: true,
      visibilityProperty: true,
    });
  }
  // Fallback for engines without Element.checkVisibility(): walk ancestors.
  let node: HTMLElement | null = el;
  while (node) {
    const style = getComputedStyle(node);
    // Only an explicit "0" counts as hidden — an unset opacity resolves to ""
    // in some engines (e.g. jsdom), which must NOT be read as transparent.
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse" ||
      style.opacity === "0"
    ) {
      return false;
    }
    node = node.parentElement;
  }
  return true;
}

/**
 * Calls `onVisible` once, the first time `el` is both near the viewport and
 * genuinely rendered. Handles CSS-only reveals (e.g. a menu toggled via
 * visibility/opacity, which produce no geometry change and thus no
 * IntersectionObserver callback) by polling `isRendered` while the element is
 * near the viewport. Polling is bounded — it never runs while the element is
 * far off-screen. Returns a cleanup function.
 */
export function whenVisible(el: HTMLElement, onVisible: () => void): () => void {
  // No IntersectionObserver (old engines / SSR) → preserve eager behavior.
  if (typeof IntersectionObserver === "undefined") {
    onVisible();
    return () => {};
  }

  let done = false;
  let timer: ReturnType<typeof setInterval> | undefined;

  const stopTimer = () => {
    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  };

  const finish = () => {
    if (done) return;
    done = true;
    stopTimer();
    io.disconnect();
    onVisible();
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          // Far off-screen: don't waste cycles polling for a CSS reveal.
          stopTimer();
          continue;
        }
        if (isRendered(el)) {
          finish();
          return;
        }
        // On-screen geometrically but CSS-hidden (closed menu): watch for the
        // reveal, which won't trigger another IntersectionObserver callback.
        if (timer === undefined) {
          timer = setInterval(() => {
            if (isRendered(el)) finish();
          }, 200);
        }
      }
    },
    // Start watching a little before it scrolls in; analytics.js still applies
    // the precise 0.5 viewport threshold before it fires the impression.
    { threshold: 0, rootMargin: "200px 0px" },
  );
  io.observe(el);

  return () => {
    done = true;
    stopTimer();
    io.disconnect();
  };
}
