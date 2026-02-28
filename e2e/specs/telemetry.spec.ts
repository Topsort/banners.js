import { expect, test } from "@playwright/test";
import { blockCDN, mockAuctionFallback, mockAuctionSuccess } from "../helpers/mock";

test.describe("telemetry", () => {
  test("successful banner has data-ts-clickable and data-ts-resolved-bid", async ({ page }) => {
    await blockCDN(page);
    await mockAuctionSuccess(page);
    await page.goto("/e2e/fixtures/index.html");
    const clickable = page.locator("[data-ts-clickable]");
    await expect(clickable).toBeVisible();
    await expect(clickable).toHaveAttribute("data-ts-resolved-bid", "resolved-bid-123");
  });

  test("fallback banner does not have data-ts-resolved-bid", async ({ page }) => {
    await blockCDN(page);
    await mockAuctionFallback(page);
    await page.goto("/e2e/fixtures/index.html");
    const clickable = page.locator("[data-ts-clickable]");
    await expect(clickable).toBeVisible();
    await expect(clickable).not.toHaveAttribute("data-ts-resolved-bid");
  });
});
