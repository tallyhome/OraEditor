import { describe, expect, it } from "vitest";
import { satisfies } from "./semver.js";
import { PluginRegistry } from "./registry.js";
import type { OraPlugin } from "./types.js";

const plugin = (id: string, extra?: Partial<OraPlugin>): OraPlugin => ({
  id,
  name: id,
  version: "1.0.0",
  compatibleCore: "^0.1.0",
  setup: () => undefined,
  ...extra,
});

describe("Plugin semver", () => {
  it("accepte ^0.1.0 pour 0.1.x", () => {
    expect(satisfies("0.1.0", "^0.1.0")).toBe(true);
    expect(satisfies("0.1.9", "^0.1.0")).toBe(true);
    expect(satisfies("0.2.0", "^0.1.0")).toBe(false);
  });
});

describe("PluginRegistry", () => {
  it("enregistre et détruit un plugin", () => {
    const registry = new PluginRegistry();
    let tornDown = false;
    registry.register(
      plugin("demo", {
        setup: () => () => {
          tornDown = true;
        },
      }),
    );
    registry.setupAll({} as never);
    expect(registry.list()).toHaveLength(1);
    registry.destroy();
    expect(tornDown).toBe(true);
  });

  it("refuse plus d'une dépendance", () => {
    const registry = new PluginRegistry();
    expect(() => registry.register(plugin("bad", { dependencies: ["a", "b"] }))).toThrow(/une dépendance/);
  });
});
