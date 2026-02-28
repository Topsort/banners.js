import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "specs",
  timeout: 10_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4173",
    browserName: "chromium",
  },
  webServer: {
    command: "pnpm vite --port 4173 --logLevel error",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
});
