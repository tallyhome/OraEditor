import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@ora-editor/core": resolve(import.meta.dirname, "packages/core/src/index.ts"),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["packages/**/*.test.ts", "tests/**/*.test.ts"],
    globals: false,
  },
});
