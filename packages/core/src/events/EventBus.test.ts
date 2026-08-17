import { describe, expect, it } from "vitest";
import { EventBus } from "./EventBus.js";

describe("EventBus", () => {
  it("émet et se désabonne", () => {
    const bus = new EventBus();
    let count = 0;
    const off = bus.on("change", () => {
      count += 1;
    });
    bus.emit("change", { source: "user" });
    off();
    bus.emit("change", { source: "user" });
    expect(count).toBe(1);
  });
});
