import { describe, expect, it } from "vitest";
import { runUpdatePipeline, sha256, type FilesystemDriver, type ReleaseManifest } from "./index.js";

function memoryFs(initial: Record<string, Uint8Array> = {}): FilesystemDriver & { store: Record<string, Uint8Array> } {
  const store = { ...initial };
  return {
    store,
    async read(path) {
      const data = store[path];
      if (!data) {
        throw new Error("missing");
      }
      return data;
    },
    async write(path, data) {
      store[path] = data;
    },
    async copyDir(from, to) {
      for (const [key, value] of Object.entries(store)) {
        if (key.startsWith(from)) {
          store[to + key.slice(from.length)] = value;
        }
      }
    },
    async remove(path) {
      for (const key of Object.keys(store)) {
        if (key.startsWith(path)) {
          delete store[key];
        }
      }
    },
    async exists(path) {
      return path in store;
    },
  };
}

describe("Update Manager", () => {
  it("installe si le checksum est valide", async () => {
    const archive = new TextEncoder().encode("ora-dist");
    const release: ReleaseManifest = {
      version: "0.2.0",
      channel: "stable",
      changelog: "test",
      checksumSha256: sha256(archive),
      compatibleCore: "^0.1.0",
      archiveUrl: "https://example.com/ora.zip",
    };
    const fs = memoryFs({ "/dest/ora-editor.js": new TextEncoder().encode("old") });
    const steps = await runUpdatePipeline(release, {
      destDir: "/dest",
      backupDir: "/backup",
      currentVersion: "0.1.0",
      fetchArchive: async () => archive,
      extract: async (_data, dest) => {
        await fs.write(`${dest}/ora-editor.js`, archive);
      },
      healthcheck: async () => true,
      fs,
    });
    expect(steps.at(-1)).toBe("success");
    expect(fs.store["/dest/ora-editor.js"]).toEqual(archive);
  });

  it("rollback si le checksum est faux", async () => {
    const archive = new TextEncoder().encode("ora-dist");
    const release: ReleaseManifest = {
      version: "0.2.0",
      channel: "stable",
      changelog: "test",
      checksumSha256: "0".repeat(64),
      compatibleCore: "^0.1.0",
      archiveUrl: "https://example.com/ora.zip",
    };
    const old = new TextEncoder().encode("old");
    const fs = memoryFs({ "/dest/ora-editor.js": old });
    await expect(
      runUpdatePipeline(release, {
        destDir: "/dest",
        backupDir: "/backup",
        currentVersion: "0.1.0",
        fetchArchive: async () => archive,
        extract: async () => undefined,
        healthcheck: async () => true,
        fs,
      }),
    ).rejects.toThrow(/Checksum/);
    expect(fs.store["/dest/ora-editor.js"]).toEqual(old);
  });
});
