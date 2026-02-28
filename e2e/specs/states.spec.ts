import { expect, test } from "@playwright/test";
import { blockCDN, mockAuctionError, mockAuctionNoWinners } from "../helpers/mock";

test.describe("states", () => {
  test("API 500 → error element appears", async ({ page }) => {
    await blockCDN(page);
    await mockAuctionError(page);
    await page.goto("/e2e/fixtures/index.html");
    await expect(page.locator('[data-testid="error-element"]')).toBeVisible();
  });

  test("API empty winners → no-winners element appears", async ({ page }) => {
    await blockCDN(page);
    await mockAuctionNoWinners(page);
    await page.goto("/e2e/fixtures/index.html");
    await expect(page.locator('[data-testid="no-winners-element"]')).toBeVisible();
  });

  test("empty token → error element appears immediately", async ({ page }) => {
    await blockCDN(page);
    await page.goto("/e2e/fixtures/no-token.html");
    await expect(page.locator('[data-testid="error-element"]')).toBeVisible();
  });
});
