import type { OraDocument, OraElement, OraNode } from "./types.js";
import { emptyParagraph, emptyText, isElement, isText } from "./types.js";
import { marksEqual } from "./marks.js";
import { Schema } from "./schema.js";
import { emptyCell, isAtomicBlock, isTable } from "./blocks.js";
import type { Operation } from "../transaction/types.js";

const schema = Schema.createDefault();

export function nextNormalizeOp(doc: OraDocument): Operation | null {
  if (doc.content.length === 0) {
    return { type: "insert_node", path: [0], node: emptyParagraph() };
  }

  for (let i = 0; i < doc.content.length; i += 1) {
    const block = doc.content[i];
    if (!block) {
      continue;
    }
    if (!isElement(block) || !schema.blocks.has(block.type) || block.type === "doc" || block.type === "tableRow" || block.type === "tableCell") {
      return {
        type: "set_node",
        path: [i],
        properties: { type: isElement(block) ? block.type : "text" },
        newProperties: { type: "paragraph" },
      };
    }
    if (isAtomicBlock(block)) {
      continue;
    }
    if (isTable(block)) {
      const tableOp = normalizeTable(block, i);
      if (tableOp) {
        return tableOp;
      }
      continue;
    }
    const content = block.content ?? [];
    if (content.length === 0) {
      return { type: "insert_node", path: [i, 0], node: emptyText() };
    }
    const inlineOp = normalizeInlines(block, [i], content);
    if (inlineOp) {
      return inlineOp;
    }
  }
  return null;
}

function normalizeTable(table: OraElement, tableIndex: number): Operation | null {
  const rows = table.content ?? [];
  if (rows.length === 0) {
    return { type: "insert_node", path: [tableIndex, 0], node: { type: "tableRow", content: [emptyCell(true)] } };
  }
  for (let r = 0; r < rows.length; r += 1) {
    const row = rows[r];
    if (!row || !isElement(row) || row.type !== "tableRow") {
      return {
        type: "set_node",
        path: [tableIndex, r],
        properties: { type: row && isElement(row) ? row.type : "text" },
        newProperties: { type: "tableRow" },
      };
    }
    const cells = row.content ?? [];
    if (cells.length === 0) {
      return { type: "insert_node", path: [tableIndex, r, 0], node: emptyCell() };
    }
    for (let c = 0; c < cells.length; c += 1) {
      const cell = cells[c];
      if (!cell || !isElement(cell) || cell.type !== "tableCell") {
        return {
          type: "set_node",
          path: [tableIndex, r, c],
          properties: { type: cell && isElement(cell) ? cell.type : "text" },
          newProperties: { type: "tableCell" },
        };
      }
      const content = cell.content ?? [];
      if (content.length === 0) {
        return { type: "insert_node", path: [tableIndex, r, c, 0], node: emptyText() };
      }
      const inlineOp = normalizeInlines(cell, [tableIndex, r, c], content);
      if (inlineOp) {
        return inlineOp;
      }
    }
  }
  return null;
}

function normalizeInlines(_block: OraElement, path: number[], content: OraNode[]): Operation | null {
  for (let j = 0; j < content.length; j += 1) {
    const node = content[j];
    if (!node) {
      continue;
    }
    if (!isText(node)) {
      return { type: "remove_node", path: [...path, j], node };
    }
    if (node.text === "" && content.length > 1) {
      return { type: "remove_node", path: [...path, j], node };
    }
    const next = content[j + 1];
    if (next && isText(next) && marksEqual(node.marks, next.marks)) {
      return {
        type: "merge_node",
        path: [...path, j + 1],
        position: node.text.length,
        properties: { marks: next.marks },
      };
    }
  }
  return null;
}

export function normalizeDocument(doc: OraDocument): OraDocument {
  return doc;
}
