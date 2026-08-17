/**
 * Mise à jour hôte OraEditor — à lancer en SSH / cron, JAMAIS depuis le navigateur.
 *
 *   node Docs/exemples/update.mjs
 *
 * Variables d'environnement :
 *   ORA_MANIFEST_URL  URL du manifest de release
 *   ORA_DEST          Dossier public des assets (JS/CSS)
 *   ORA_BACKUP        Dossier de sauvegarde
 *   ORA_CURRENT       Version actuellement déployée (ex. 0.1.0)
 *
 * Nécessite @ora-editor/update-manager (monorepo) et un unzip (ici : hypothèse zip).
 */
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createUpdateManager, createLocalFs } from "@ora-editor/update-manager";

const execFileAsync = promisify(execFile);

const MANIFEST_URL = process.env.ORA_MANIFEST_URL ?? "https://exemple.fr/releases/ora-editor.manifest.json";
const DEST = process.env.ORA_DEST ?? "./public/ora-editor";
const BACKUP = process.env.ORA_BACKUP ?? "./backups/ora-editor";
const CURRENT = process.env.ORA_CURRENT ?? "0.1.0";

const mgr = createUpdateManager();
const release = await mgr.check(MANIFEST_URL);
console.log("Release", release.version, release.channel);

await mgr.apply(release, {
  destDir: DEST,
  backupDir: BACKUP,
  currentVersion: CURRENT,
  fs: createLocalFs(),
  async fetchArchive(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Archive HTTP ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  },
  async extract(archive, dest) {
    const zipPath = join(tmpdir(), `ora-editor-${Date.now()}.zip`);
    await mkdir(dest, { recursive: true });
    await pipeline(Readable.from(archive), createWriteStream(zipPath));
    try {
      await execFileAsync("tar", ["-xf", zipPath, "-C", dest]);
    } catch {
      await execFileAsync("powershell", ["-NoProfile", "-Command", `Expand-Archive -Force -Path "${zipPath}" -DestinationPath "${dest}"`]);
    } finally {
      await rm(zipPath, { force: true });
    }
  },
  async healthcheck() {
    try {
      const js = await readFile(join(DEST, "ora-editor.js"));
      const css = await readFile(join(DEST, "ora-editor.css"));
      return js.byteLength > 1000 && css.byteLength > 100;
    } catch {
      return false;
    }
  },
});

console.log("OraEditor mis à jour vers", release.version);
