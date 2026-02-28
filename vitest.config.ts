import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
  define: {
    "import.meta.env.PACKAGE_VERSION": JSON.stringify("test"),
  },
});
