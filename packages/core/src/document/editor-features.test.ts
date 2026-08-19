import { describe, expect, it } from "vitest";
import { matchBlockShortcut, matchBoldShortcut, matchItalicShortcut } from "./markdown.js";
import { buildTableGrid, cellColSpan, findOriginSlot } from "./table.js";
import { documentStats, findMatches, isEmptyDocument, replaceInString } from "./search.js";
import { createEmptyDocument } from "./types.js";
import { resolveLocale, t } from "../i18n/index.js";

describe("Markdown shortcuts", () => {
  it("détecte titres, listes et gras", () => {
    expect(matchBlockShortcut("# ")).toEqual({ kind: "heading", level: 1 });
    expect(matchBlockShortcut("### ")).toEqual({ kind: "heading", level: 3 });
    expect(matchBlockShortcut("- ")).toEqual({ kind: "list", ordered: false });
    expect(matchBlockShortcut("1. ")).toEqual({ kind: "list", ordered: true });
    expect(matchBlockShortcut("---")).toEqual({ kind: "rule" });
    expect(matchBoldShortcut("**texte**")).toEqual({ from: 0, inner: "texte", raw: "**texte**" });
    expect(matchItalicShortcut("*ok*")).toEqual({ from: 0, inner: "ok", raw: "*ok*" });
    expect(matchItalicShortcut("**ok**")).toBeNull();
  });
});

describe("Table grid", () => {
  it("repère une cellule fusionnée", () => {
    const table = {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            { type: "tableCell", attrs: { colspan: 2 }, content: [{ type: "text", text: "AB" }] },
          ],
        },
        {
          type: "tableRow",
          content: [
            { type: "tableCell", content: [{ type: "text", text: "C" }] },
            { type: "tableCell", content: [{ type: "text", text: "D" }] },
          ],
        },
      ],
    };
    const grid = buildTableGrid(table);
    expect(cellColSpan(table.content[0]?.content?.[0] as never)).toBe(2);
    expect(findOriginSlot(grid, 0, 0)?.visualCol).toBe(0);
    expect(grid[0]?.[1]?.origin).toBe(false);
  });
});

describe("Recherche et stats", () => {
  it("compte les mots et trouve des occurrences", () => {
    const doc = {
      version: 1,
      type: "doc" as const,
      content: [{ type: "paragraph", content: [{ type: "text", text: "Bonjour le monde" }] }],
    };
    expect(documentStats(doc).words).toBe(3);
    expect(findMatches(doc, "monde")).toHaveLength(1);
    expect(replaceInString("Bonjour Bonjour", "bonjour", "Hi", false)).toBe("Hi Hi");
    expect(isEmptyDocument(createEmptyDocument())).toBe(true);
  });
});

describe("i18n", () => {
  it("résout les locales et pluralise", () => {
    expect(resolveLocale("ru-RU")).toBe("ru");
    expect(resolveLocale("pt-BR")).toBe("pt");
    expect(t("en", "undo")).toContain("Undo");
    expect(t("fr", "words", { n: 1 })).toContain("1 mot");
    expect(t("fr", "words", { n: 2 })).toContain("2 mots");
  });
});
