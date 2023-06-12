import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es", "cjs"],
    },
    target: "modules",
    sourcemap: true,
    rollupOptions: {
      external: /^lit/,
    },
  },
  define: {
    "import.meta.env.PACKAGE_VERSION": JSON.stringify(process.env.npm_package_version),
  },
});
