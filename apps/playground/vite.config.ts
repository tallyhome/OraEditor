import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: import.meta.dirname,
  resolve: {
    alias: {
      "@ora-editor/core/style.css": resolve(
        import.meta.dirname,
        "../../packages/core/src/styles/ora-editor.css",
      ),
      "@ora-editor/core": resolve(import.meta.dirname, "../../packages/core/src/index.ts"),
    },
  },
  server: {
    port: 5173,
  },
});
