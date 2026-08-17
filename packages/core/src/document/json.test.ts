import { describe, expect, it } from "vitest";
import { fromJSON, toJSON } from "./json.js";
import { createEmptyDocument } from "./types.js";
import { nextNormalizeOp } from "./normalize.js";
import { applyOperation } from "../transaction/apply.js";
import { initialSelection } from "../selection/types.js";
import type { OraDocument } from "./types.js";

describe("Document Model JSON", () => {
  it("round-trip un document simple", () => {
    const doc: OraDocument = {
      version: 1,
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Mon titre" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Bonjour " },
            { type: "text", text: "Fabien", marks: [{ type: "bold" }] },
          ],
        },
      ],
    };
    expect(fromJSON(toJSON(doc))).toEqual(doc);
  });

  it("rejette les types inconnus vers paragraph", () => {
    const doc = fromJSON({
      version: 1,
      type: "doc",
      content: [{ type: "unknown-widget", content: [{ type: "text", text: "x" }] }],
    });
    expect(doc.content[0]?.type).toBe("paragraph");
  });

  it("ignore les marks inconnues", () => {
    const doc = fromJSON({
      version: 1,
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "x", marks: [{ type: "magic" }, { type: "italic" }] }],
        },
      ],
    });
    const text = doc.content[0] && "content" in doc.content[0] ? doc.content[0].content?.[0] : null;
    expect(text && "marks" in text ? text.marks : []).toEqual([{ type: "italic" }]);
  });

  it("crée un document vide valide", () => {
    const doc = createEmptyDocument();
    expect(doc.version).toBe(1);
    expect(doc.content).toHaveLength(1);
    expect(doc.content[0]?.type).toBe("paragraph");
  });

  it("refuse un document trop récent", () => {
    expect(() => fromJSON({ version: 99, type: "doc", content: [] })).toThrow(/non pris en charge/);
  });

  it("conserve listItem, citation et attrs d'alignement", () => {
    const doc = fromJSON({
      version: 1,
      type: "doc",
      content: [
        { type: "listItem", attrs: { ordered: true, level: 2, align: "right" }, content: [{ type: "text", text: "x" }] },
        { type: "blockquote", attrs: { indent: 1 }, content: [{ type: "text", text: "q" }] },
        { type: "codeBlock", content: [{ type: "text", text: "code" }] },
      ],
    });
    expect(doc.content[0]).toMatchObject({ type: "listItem", attrs: { ordered: true, level: 2, align: "right" } });
    expect(doc.content[1]?.type).toBe("blockquote");
    expect(doc.content[2]?.type).toBe("codeBlock");
  });
});

describe("Normalisation", () => {
  it("insère un paragraphe si le document est vide", () => {
    const doc: OraDocument = { version: 1, type: "doc", content: [] };
    const op = nextNormalizeOp(doc);
    expect(op?.type).toBe("insert_node");
  });

  it("fusionne deux textes adjacents aux mêmes marks", () => {
    const doc: OraDocument = {
      version: 1,
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello" },
            { type: "text", text: "World" },
          ],
        },
      ],
    };
    const op = nextNormalizeOp(doc);
    expect(op).toMatchObject({ type: "merge_node", path: [0, 1], position: 5 });
    if (!op) {
      throw new Error("op attendue");
    }
    const { doc: next } = applyOperation(doc, initialSelection(), op);
    expect(next.content[0] && "content" in next.content[0] ? next.content[0].content : []).toEqual([
      { type: "text", text: "HelloWorld" },
    ]);
    expect(nextNormalizeOp(next)).toBeNull();
  });
});
