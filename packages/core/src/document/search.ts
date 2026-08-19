import type { OraDocument, OraElement, Path } from "./types.js";
import { isElement, isText } from "./types.js";
import { getNode, textContent, walkTextPaths } from "./node.js";

export interface TextMatch {
  path: Path;
  start: number;
  end: number;
}

export interface DocumentStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
}

export function documentText(doc: OraDocument): string {
  return doc.content.map((block) => textContent(block)).join("\n");
}

export function documentStats(doc: OraDocument): DocumentStats {
  const text = documentText(doc);
  const words = text.trim() === "" ? 0 : (text.trim().match(/\S+/g) ?? []).length;
  return {
    words,
    characters: text.length,
    charactersNoSpaces: text.replace(/\s+/g, "").length,
  };
}

export function isEmptyDocument(doc: OraDocument): boolean {
  if (doc.content.length !== 1) {
    return false;
  }
  const block = doc.content[0];
  if (!block || !isElement(block) || block.type !== "paragraph") {
    return false;
  }
  return textContent(block).trim() === "";
}

export function findMatches(doc: OraDocument, query: string, caseSensitive = false): TextMatch[] {
  if (!query) {
    return [];
  }
  const matches: TextMatch[] = [];
  const needle = caseSensitive ? query : query.toLocaleLowerCase();
  for (const path of walkTextPaths(doc)) {
    const node = getNode(doc, path);
    if (!isText(node) || node.text.length === 0) {
      continue;
    }
    const haystack = caseSensitive ? node.text : node.text.toLocaleLowerCase();
    let from = 0;
    while (from <= haystack.length - needle.length) {
      const index = haystack.indexOf(needle, from);
      if (index < 0) {
        break;
      }
      matches.push({ path, start: index, end: index + query.length });
      from = index + Math.max(1, needle.length);
    }
  }
  return matches;
}

export function replaceInString(text: string, query: string, replacement: string, caseSensitive = false): string {
  if (!query) {
    return text;
  }
  if (caseSensitive) {
    return text.split(query).join(replacement);
  }
  const source = text.toLocaleLowerCase();
  const needle = query.toLocaleLowerCase();
  let out = "";
  let from = 0;
  while (from <= text.length) {
    const index = source.indexOf(needle, from);
    if (index < 0) {
      out += text.slice(from);
      break;
    }
    out += text.slice(from, index) + replacement;
    from = index + query.length;
  }
  return out;
}

export function currentTableCell(doc: OraDocument, path: Path): OraElement | null {
  if (path.length < 3) {
    return null;
  }
  const cell = getNode(doc, path.slice(0, 3));
  return isElement(cell) && cell.type === "tableCell" ? cell : null;
}
