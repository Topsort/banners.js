import { expect, test } from "@playwright/test";
import { blockCDN, mockAuctionSuccess } from "../helpers/mock";

test.describe("render", () => {
  test.beforeEach(async ({ page }) => {
    await blockCDN(page);
    await mockAuctionSuccess(page);
    await page.goto("/e2e/fixtures/index.html");
  });

  test("renders img with correct src inside .ts-banner", async ({ page }) => {
    const img = page.locator(".ts-banner img");
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute("src", "https://example.com/banner.jpg");
  });

  test("sets CSS custom properties for width and height", async ({ page }) => {
    const banner = page.locator("topsort-banner");
    await expect(banner).toBeAttached();
    const width = await banner.evaluate((el: HTMLElement) =>
      el.style.getPropertyValue("--ts-banner-width"),
    );
    const height = await banner.evaluate((el: HTMLElement) =>
      el.style.getPropertyValue("--ts-banner-height"),
    );
    expect(width).toBe("600px");
    expect(height).toBe("400px");
  });

  test("banner link has correct href", async ({ page }) => {
    const link = page.locator(".ts-banner a");
    await expect(link).toHaveAttribute("href", "https://example.com/product");
  });

  test("img is rendered at the dimensions specified on the banner element", async ({ page }) => {
    const img = page.locator(".ts-banner img");
    await expect(img).toBeVisible();
    await expect(img).toHaveCSS("width", "600px");
    await expect(img).toHaveCSS("height", "400px");
  });
});
