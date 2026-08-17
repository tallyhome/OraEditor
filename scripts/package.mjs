import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "packages/core/dist");
const out = join(root, "dist/ora-editor");

await mkdir(out, { recursive: true });
const files = ["ora-editor.js", "ora-editor.mjs", "ora-editor.css"];
const checksums = {};
for (const name of files) {
  const source = join(dist, name);
  const data = await readFile(source);
  checksums[name] = createHash("sha256").update(data).digest("hex");
  await copyFile(source, join(out, name));
}
const manifest = {
  name: "ora-editor",
  version: "0.1.0",
  channel: "stable",
  compatibleCore: "^0.1.0",
  files,
  checksums,
};
await writeFile(join(out, "ora-editor.manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Packaged ${out}`);
