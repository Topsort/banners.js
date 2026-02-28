import type { Page } from "@playwright/test";

export async function blockCDN(page: Page) {
  await page.route("**analytics**", (route) => route.abort());
  await page.route("**hls.js**", (route) => route.abort());
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
