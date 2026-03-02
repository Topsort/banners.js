import path from "node:path";
import { defineConfig } from "@playwright/test";

const root = path.resolve(import.meta.dirname, "..");

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
    command: "node node_modules/vite/bin/vite.js --port 4173 --logLevel error",
    cwd: root,
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
});
