/**
 * Gets the opaque user ID for auction requests.
 *
 * analytics.js keeps the ID in a cookie (`tsuid`, or `window.TS.cookieName`) and only generates
 * one when that cookie is missing. When analytics.js has not run yet, reading or creating the same
 * cookie here keeps the auction and the user's later events under one ID: analytics.js adopts the
 * cookie when it loads. The cookie format below mirrors analytics.js and must stay in sync with it.
 */

const COOKIE_MAX_AGE_SECONDS = 31536000;

function generateId(): string {
  try {
    return window.URL.createObjectURL?.(new Blob()).split("/").pop() || `${Math.random()}`;
  } catch {
    return `${Math.random()}`;
  }
}

function readCookie(name: string): string | undefined {
  const regex = new RegExp(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`);
  return regex.exec(document.cookie)?.pop();
}

/**
 * Returns window.TS.getUserId() when it is defined (analytics.js or a merchant override).
 * Otherwise returns the analytics.js user ID cookie, creating it if it does not exist yet.
 */
export function getOpaqueUserId(): string | undefined {
  if (typeof window.TS?.getUserId === "function") {
    return window.TS.getUserId();
  }

  const cookieName = window.TS?.cookieName || "tsuid";
  const existing = readCookie(cookieName);
  if (existing) {
    return existing;
  }

  const id = generateId();
  // biome-ignore lint/suspicious/noDocumentCookie: must match analytics.js synchronously; the Cookie Store API is async and not universally supported.
  document.cookie = `${cookieName}=${id};max-age=${COOKIE_MAX_AGE_SECONDS}`;
  return id;
}
