import { expect, test } from "@playwright/test";
import {
  blockCDN,
  captureStateChanges,
  mockAuctionError,
  mockAuctionNoWinners,
  mockAuctionSuccess,
} from "../helpers/mock";

test.describe("events", () => {
  test("success → statechange fires with status ready and slotId", async ({ page }) => {
    await blockCDN(page);
    await mockAuctionSuccess(page);
    await captureStateChanges(page);
    await page.goto("/e2e/fixtures/index.html");
    await page.locator(".ts-banner").waitFor();
    // biome-ignore lint/suspicious/noExplicitAny: accessing injected test helper
    const events = await page.evaluate(() => (window as any).__stateChanges);
    expect(events).toContainEqual(expect.objectContaining({ status: "ready", slotId: "test-slot" }));
  });

  test("API 500 → statechange fires with status error", async ({ page }) => {
    await blockCDN(page);
    await mockAuctionError(page);
    await captureStateChanges(page);
    await page.goto("/e2e/fixtures/index.html");
    await page.locator('[data-testid="error-element"]').waitFor();
    // biome-ignore lint/suspicious/noExplicitAny: accessing injected test helper
    const events = await page.evaluate(() => (window as any).__stateChanges);
    expect(events).toContainEqual(expect.objectContaining({ status: "error" }));
  });

  test("empty winners → statechange fires with status nowinners", async ({ page }) => {
    await blockCDN(page);
    await mockAuctionNoWinners(page);
    await captureStateChanges(page);
    await page.goto("/e2e/fixtures/index.html");
    await page.locator('[data-testid="no-winners-element"]').waitFor();
    // biome-ignore lint/suspicious/noExplicitAny: accessing injected test helper
    const events = await page.evaluate(() => (window as any).__stateChanges);
    expect(events).toContainEqual(expect.objectContaining({ status: "nowinners" }));
  });
});
