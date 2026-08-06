import type { Page } from "@playwright/test";

/** 1×1 PNG so banner <img> requests never hit the network or render as broken images. */
const PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

export async function blockCDN(page: Page) {
  await page.route("**analytics**", (route) => route.abort());
  await page.route("**hls.js**", (route) => route.abort());
  // Auction mocks use example.com asset URLs. Those URLs 404 with HTML, which
  // makes Chromium treat the <img> as broken and report unstable computed sizes
  // (e.g. height 18px) even when width/height styles are set. Serve a real PNG.
  await page.route("**/example.com/**", async (route) => {
    const url = route.request().url();
    if (/\.(avif|gif|jpe?g|png|svg|webp)(\?|$)/i.test(url)) {
      await route.fulfill({ status: 200, contentType: "image/png", body: PIXEL_PNG });
      return;
    }
    await route.continue();
  });
}

export async function mockAuctionSuccess(
  page: Page,
  banner = {
    type: "url",
    id: "https://example.com/product",
    resolvedBidId: "resolved-bid-123",
    asset: [{ url: "https://example.com/banner.jpg" }],
  },
) {
  await page.route("**/v2/auctions", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ results: [{ winners: [banner] }] }),
    });
  });
}

export async function mockAuctionError(page: Page, status = 500) {
  await page.route("**/v2/auctions", (route) => {
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ message: "Internal Server Error" }),
    });
  });
}

export async function mockAuctionNoWinners(page: Page) {
  await page.route("**/v2/auctions", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ results: [{ winners: [] }] }),
    });
  });
}

export async function mockAuctionFallback(page: Page) {
  await page.route("**/v2/auctions", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        results: [
          {
            winners: [
              {
                type: "url",
                id: "https://example.com/fallback",
                resolvedBidId: "fallback-bid-123",
                isFallback: true,
                asset: [{ url: "https://example.com/fallback.jpg" }],
              },
            ],
          },
        ],
      }),
    });
  });
}

export async function captureStateChanges(page: Page) {
  await page.addInitScript(() => {
    // biome-ignore lint/suspicious/noExplicitAny: test helper
    (window as any).__stateChanges = [];
    document.addEventListener("statechange", (e: Event) => {
      // biome-ignore lint/suspicious/noExplicitAny: test helper
      (window as any).__stateChanges.push((e as CustomEvent).detail);
    });
  });
}
