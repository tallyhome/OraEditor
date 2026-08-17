import type { OraElement, OraNode } from "./types.js";
import { isElement } from "./types.js";
import { isTextBlockType } from "./schema.js";

export const ATOMIC_BLOCK_TYPES = ["image", "video", "audio", "embed"] as const;
export type AtomicBlockType = (typeof ATOMIC_BLOCK_TYPES)[number];

export function isTextBlock(node: OraNode): node is OraElement & { type: string } {
  return isElement(node) && isTextBlockType(node.type);
}

export function isListItem(node: OraNode): node is OraElement & { type: "listItem" } {
  return isElement(node) && node.type === "listItem";
}

export function isAtomicBlock(node: OraNode): node is OraElement & { type: AtomicBlockType } {
  return isElement(node) && (ATOMIC_BLOCK_TYPES as readonly string[]).includes(node.type);
}

export function isTable(node: OraNode): node is OraElement & { type: "table" } {
  return isElement(node) && node.type === "table";
}

export function emptyListItem(ordered: boolean, level = 0): OraElement {
  return {
    type: "listItem",
    attrs: { ordered, level },
    content: [{ type: "text", text: "" }],
  };
}

export function emptyBlockquote(): OraElement {
  return { type: "blockquote", content: [{ type: "text", text: "" }] };
}

export function emptyCodeBlock(): OraElement {
  return { type: "codeBlock", content: [{ type: "text", text: "" }] };
}

export function emptyCell(header = false): OraElement {
  return {
    type: "tableCell",
    attrs: header ? { header: true } : undefined,
    content: [{ type: "text", text: "" }],
  };
}

export function emptyRow(cols: number, header = false): OraElement {
  return {
    type: "tableRow",
    content: Array.from({ length: Math.max(1, cols) }, () => emptyCell(header)),
  };
}

export function emptyTable(rows = 3, cols = 3): OraElement {
  const safeRows = Math.min(20, Math.max(1, rows));
  const safeCols = Math.min(12, Math.max(1, cols));
  return {
    type: "table",
    content: [emptyRow(safeCols, true), ...Array.from({ length: safeRows - 1 }, () => emptyRow(safeCols))],
  };
}

export function createImage(attrs: Record<string, unknown>): OraElement {
  return { type: "image", attrs };
}

export function createMedia(type: "video" | "audio" | "embed", attrs: Record<string, unknown>): OraElement {
  return { type, attrs };
}
