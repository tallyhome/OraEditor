import { describe, expect, it } from "vitest";
import { History } from "./History.js";
import { initialSelection } from "../selection/types.js";

describe("History", () => {
  const selection = initialSelection();

  it("empile undo et redo", () => {
    const history = new History();
    history.push({
      ops: [{ type: "insert_text", path: [0, 0], offset: 0, text: "a" }],
      inverses: [{ type: "remove_text", path: [0, 0], offset: 0, text: "a" }],
      selectionBefore: selection,
      selectionAfter: selection,
      storedMarksBefore: null,
      storedMarksAfter: null,
      time: 1,
      kind: "typing",
    });
    expect(history.canUndo).toBe(true);
    const step = history.popUndo();
    expect(step?.ops[0]).toMatchObject({ type: "insert_text" });
    expect(history.canRedo).toBe(true);
    history.popRedo();
    expect(history.canUndo).toBe(true);
  });

  it("groupe les frappes proches", () => {
    const history = new History();
    const base = {
      inverses: [{ type: "remove_text" as const, path: [0, 0], offset: 0, text: "a" }],
      selectionBefore: selection,
      selectionAfter: selection,
      storedMarksBefore: null,
      storedMarksAfter: null,
      kind: "typing" as const,
    };
    history.push({
      ...base,
      ops: [{ type: "insert_text", path: [0, 0], offset: 0, text: "a" }],
      time: 1000,
    });
    history.push({
      ...base,
      ops: [{ type: "insert_text", path: [0, 0], offset: 1, text: "b" }],
      inverses: [{ type: "remove_text", path: [0, 0], offset: 1, text: "b" }],
      time: 1200,
    });
    const step = history.popUndo();
    expect(step?.ops).toHaveLength(2);
  });

  it("ne groupe pas un formatage avec une frappe", () => {
    const history = new History();
    history.push({
      ops: [{ type: "insert_text", path: [0, 0], offset: 0, text: "a" }],
      inverses: [{ type: "remove_text", path: [0, 0], offset: 0, text: "a" }],
      selectionBefore: selection,
      selectionAfter: selection,
      storedMarksBefore: null,
      storedMarksAfter: null,
      time: 1,
      kind: "typing",
    });
    history.push({
      ops: [{ type: "set_node", path: [0, 0], properties: {}, newProperties: { marks: [{ type: "bold" }] } }],
      inverses: [{ type: "set_node", path: [0, 0], properties: { marks: [{ type: "bold" }] }, newProperties: {} }],
      selectionBefore: selection,
      selectionAfter: selection,
      storedMarksBefore: null,
      storedMarksAfter: null,
      time: 2,
      kind: "format",
    });
    history.popUndo();
    expect(history.canUndo).toBe(true);
  });
});
