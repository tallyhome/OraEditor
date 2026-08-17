import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile, cp } from "node:fs/promises";
import { dirname, join } from "node:path";

export type UpdateChannel = "stable" | "beta" | "nightly";

export type UpdateStep =
  | "check"
  | "compatibility"
  | "backup"
  | "download"
  | "verify"
  | "install"
  | "test"
  | "success"
  | "rollback";

export interface ReleaseManifest {
  version: string;
  channel: UpdateChannel;
  changelog: string;
  checksumSha256: string;
  compatibleCore: string;
  archiveUrl: string;
  signature?: string;
}

export interface FilesystemDriver {
  read(path: string): Promise<Uint8Array>;
  write(path: string, data: Uint8Array): Promise<void>;
  copyDir(from: string, to: string): Promise<void>;
  remove(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}

export interface UpdateContext {
  destDir: string;
  backupDir: string;
  currentVersion: string;
  fetchArchive: (url: string) => Promise<Uint8Array>;
  extract: (archive: Uint8Array, dest: string) => Promise<void>;
  healthcheck: () => Promise<boolean>;
  fs: FilesystemDriver;
}

export function sha256(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

export function createLocalFs(): FilesystemDriver {
  return {
    async read(path) {
      return new Uint8Array(await readFile(path));
    },
    async write(path, data) {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, data);
    },
    async copyDir(from, to) {
      await mkdir(dirname(to), { recursive: true });
      await cp(from, to, { recursive: true });
    },
    async remove(path) {
      await rm(path, { recursive: true, force: true });
    },
    async exists(path) {
      try {
        await readFile(path);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export async function runUpdatePipeline(release: ReleaseManifest, ctx: UpdateContext): Promise<UpdateStep[]> {
  const steps: UpdateStep[] = ["check", "compatibility"];
  if (!isCompatible(ctx.currentVersion, release.compatibleCore)) {
    steps.push("rollback");
    throw new Error(`Version Core ${ctx.currentVersion} incompatible avec ${release.compatibleCore}.`);
  }
  try {
    steps.push("backup");
    await ctx.fs.copyDir(ctx.destDir, ctx.backupDir);
    steps.push("download");
    const archive = await ctx.fetchArchive(release.archiveUrl);
    steps.push("verify");
    if (sha256(archive) !== release.checksumSha256) {
      throw new Error("Checksum SHA-256 invalide.");
    }
    steps.push("install");
    await ctx.extract(archive, ctx.destDir);
    steps.push("test");
    if (!(await ctx.healthcheck())) {
      throw new Error("Healthcheck après installation échoué.");
    }
    steps.push("success");
    return steps;
  } catch (error) {
    steps.push("rollback");
    await ctx.fs.copyDir(ctx.backupDir, ctx.destDir);
    throw error;
  }
}

export function isCompatible(current: string, range: string): boolean {
  if (range === "*" || range === current) {
    return true;
  }
  const min = range.replace(/^[^\d]*/, "").split(".")[0];
  return current.split(".")[0] === min;
}

export async function checkManifest(url: string, fetchFn: typeof fetch = fetch): Promise<ReleaseManifest> {
  const response = await fetchFn(url);
  if (!response.ok) {
    throw new Error(`Manifest introuvable (${response.status}).`);
  }
  return (await response.json()) as ReleaseManifest;
}

export function createUpdateManager() {
  return {
    check: checkManifest,
    apply: runUpdatePipeline,
    sha256,
  };
}

export function destFile(dir: string, name: string): string {
  return join(dir, name);
}
