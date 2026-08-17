import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  publicDir: false,
  build: {
    sourcemap: false,
    emptyOutDir: true,
    lib: {
      entry: resolve(import.meta.dirname, "packages/core/src/index.ts"),
      name: "OraEditor",
      formats: ["iife", "es"],
      fileName: (format) => (format === "iife" ? "ora-editor.js" : "ora-editor.mjs"),
    },
    outDir: resolve(import.meta.dirname, "packages/core/dist"),
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          const name = assetInfo.names?.[0] ?? assetInfo.name ?? "asset";
          if (name.endsWith(".css")) {
            return "ora-editor.css";
          }
          return name;
        },
        exports: "named",
        footer: `if (typeof OraEditor !== "undefined" && OraEditor.default) { globalThis.OraEditor = OraEditor.default; }`,
      },
    },
  },
});
