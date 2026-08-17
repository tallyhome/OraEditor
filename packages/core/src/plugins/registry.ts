import { CORE_VERSION } from "../version.js";
import type { OraEditor } from "../api/OraEditor.js";
import type { OraPlugin } from "./types.js";
import { satisfies } from "./semver.js";

export class PluginRegistry {
  private plugins = new Map<string, OraPlugin>();
  private teardowns = new Map<string, () => void>();

  register(plugin: OraPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Le plugin "${plugin.id}" est déjà enregistré.`);
    }
    if (plugin.dependencies && plugin.dependencies.length > 1) {
      throw new Error(`Le plugin "${plugin.id}" ne peut déclarer qu'une dépendance au plus.`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  unregister(id: string): void {
    this.teardowns.get(id)?.();
    this.teardowns.delete(id);
    this.plugins.delete(id);
  }

  get(id: string): OraPlugin | undefined {
    return this.plugins.get(id);
  }

  list(): OraPlugin[] {
    return [...this.plugins.values()];
  }

  setupAll(editor: OraEditor): void {
    for (const plugin of this.plugins.values()) {
      this.setupOne(editor, plugin);
    }
  }

  setupOne(editor: OraEditor, plugin: OraPlugin): void {
    if (!satisfies(CORE_VERSION, plugin.compatibleCore)) {
      throw new Error(
        `Plugin "${plugin.id}" incompatible avec le Core ${CORE_VERSION} (requis : ${plugin.compatibleCore}).`,
      );
    }
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(`Plugin "${plugin.id}" : dépendance manquante "${dep}".`);
        }
      }
    }
    const teardown = plugin.setup(editor);
    if (typeof teardown === "function") {
      this.teardowns.set(plugin.id, teardown);
    }
  }

  destroy(): void {
    for (const teardown of this.teardowns.values()) {
      teardown();
    }
    this.teardowns.clear();
  }
}
