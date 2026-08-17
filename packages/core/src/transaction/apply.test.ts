import { describe, expect, it } from "vitest";
import { createEmptyDocument } from "../document/types.js";
import { applyOperation } from "./apply.js";
import { invertOperation } from "./invert.js";
import { Transform } from "./transform.js";
import { collapsed, initialSelection } from "../selection/types.js";
import { transformPath, transformPoint } from "./mapping.js";

const emptyState = () => ({
  doc: createEmptyDocument(),
  selection: initialSelection(),
  storedMarks: null,
});

describe("Transactions", () => {
  it("insert_text puis invert restaure le document", () => {
    const doc = createEmptyDocument();
    const selection = initialSelection();
    const op = { type: "insert_text" as const, path: [0, 0], offset: 0, text: "Hi" };
    const inverse = invertOperation(doc, selection, op);
    const applied = applyOperation(doc, selection, op);
    expect(applied.doc.content[0]).toMatchObject({
      content: [{ type: "text", text: "Hi" }],
    });
    const undone = applyOperation(applied.doc, applied.selection, inverse);
    expect(undone.doc).toEqual(doc);
  });

  it("mappe le curseur après insert_text", () => {
    const point = transformPoint({ path: [0, 0], offset: 1 }, {
      type: "insert_text",
      path: [0, 0],
      offset: 1,
      text: "ab",
    });
    expect(point).toEqual({ path: [0, 0], offset: 3 });
  });

  it("mappe un chemin après insert_node", () => {
    const path = transformPath([1], { type: "insert_node", path: [1], node: { type: "paragraph", content: [] } });
    expect(path).toEqual([2]);
  });
});

describe("Transform commandes", () => {
  it("insertText et setBlock heading", () => {
    const tr = new Transform(emptyState());
    tr.insertText("Hello");
    tr.setBlockType("heading", { level: 2 });
    expect(tr.doc.content[0]?.type).toBe("heading");
    expect(tr.doc.content[0]).toMatchObject({ attrs: { level: 2 } });
  });

  it("toggleMark gras sur une sélection", () => {
    const tr = new Transform(emptyState());
    tr.insertText("Hello");
    tr.setSelection({
      type: "text",
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 5 },
    });
    tr.toggleMark({ type: "bold" });
    const text = tr.doc.content[0] && "content" in tr.doc.content[0] ? tr.doc.content[0].content?.[0] : null;
    expect(text).toMatchObject({ type: "text", text: "Hello", marks: [{ type: "bold" }] });
  });

  it("splitBlock crée un second paragraphe", () => {
    const tr = new Transform(emptyState());
    tr.insertText("Hello");
    tr.splitBlock();
    expect(tr.doc.content).toHaveLength(2);
    expect(tr.selection).toEqual(collapsed({ path: [1, 0], offset: 0 }));
  });

  it("deleteBackward fusionne les blocs", () => {
    const tr = new Transform(emptyState());
    tr.insertText("A");
    tr.splitBlock();
    tr.insertText("B");
    tr.deleteBackward();
    tr.deleteBackward();
    const para = tr.doc.content[0];
    const text = para && "content" in para ? para.content?.[0] : null;
    expect(tr.doc.content).toHaveLength(1);
    expect(text).toMatchObject({ type: "text", text: "A" });
  });
});
