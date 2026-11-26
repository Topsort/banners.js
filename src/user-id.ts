/**
 * Gets the opaque user ID for auction requests.
 *
 * analytics.js keeps the ID in a cookie (`tsuid`, or `window.TS.cookieName`). When analytics.js
 * has not run yet, reading that cookie keeps the auction and the user's events under one ID.
 * banners.js never creates the cookie: analytics.js owns it, so a merchant that delays analytics.js
 * until consent gets no identifier cookie from banners.js either.
 */

function readCookie(name: string): string | undefined {
  try {
    const regex = new RegExp(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`);
    return regex.exec(document.cookie)?.pop();
  } catch {
    // Reading document.cookie throws a SecurityError in opaque-origin documents (e.g. sandboxed
    // iframes). The auction must still run, just without an ID.
    return undefined;
  }
}

/**
 * Returns window.TS.getUserId() when it is defined (analytics.js or a merchant override).
 * Otherwise returns the analytics.js user ID cookie if it exists.
 */
export function getOpaqueUserId(): string | undefined {
  if (typeof window.TS?.getUserId === "function") {
    return window.TS.getUserId();
  }
  return readCookie(window.TS?.cookieName || "tsuid");
}
