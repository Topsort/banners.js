/**
 * Gets the opaque user ID for auction requests
 * Uses analytics.js getUserId function if available
 */

/**
 * Gets the opaque user ID to use for auctions
 * Calls window.TS.getUserId() which is provided by analytics.js
 * Returns undefined if analytics.js is not loaded or getUserId is not available
 */
export function getOpaqueUserId(): string | undefined {
  // Use getUserId from analytics.js if available
  if (window.TS?.getUserId && typeof window.TS.getUserId === "function") {
    return window.TS.getUserId();
  }

  // Analytics.js not loaded yet or getUserId not available
  return undefined;
}
