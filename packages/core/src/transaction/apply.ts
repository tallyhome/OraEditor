import type { OraDocument, OraElement, OraNode, OraText } from "../document/types.js";
import { cloneNode, isElement, isText } from "../document/types.js";
import { getNode, insertNodeAt, insertTextAt, removeNodeAt, removeTextAt, updateNode } from "../document/node.js";
import { pathIndex, pathParent, pathPrevious } from "../document/path.js";
import type { Selection } from "../selection/types.js";
import { initialSelection } from "../selection/types.js";
import { mapSelection } from "../selection/selection.js";
import type { Operation } from "./types.js";

export interface ApplyResult {
  doc: OraDocument;
  selection: Selection;
}

export function applyOperation(doc: OraDocument, selection: Selection, op: Operation): ApplyResult {
  const nextDoc = execute(doc, op);
  const nextSelection = mapSelection(selection, op) ?? initialSelection();
  return { doc: nextDoc, selection: nextSelection };
}

function execute(doc: OraDocument, op: Operation): OraDocument {
  switch (op.type) {
    case "insert_text":
      return insertTextAt(doc, op.path, op.offset, op.text);
    case "remove_text":
      return removeTextAt(doc, op.path, op.offset, op.text);
    case "insert_node":
      return insertNodeAt(doc, op.path, op.node);
    case "remove_node":
      return removeNodeAt(doc, op.path).doc;
    case "set_node":
      return updateNode(doc, op.path, (node) => applySetNode(node, op.newProperties));
    case "split_node":
      return splitNode(doc, op.path, op.position, op.properties);
    case "merge_node":
      return mergeNode(doc, op.path);
    case "set_selection":
      return doc;
    default:
      return doc;
  }
}

function applySetNode(
  node: OraNode,
  properties: { type?: string; attrs?: Record<string, unknown>; marks?: OraText["marks"]; text?: string },
): OraNode {
  if (isText(node)) {
    const next: OraText = { ...node };
    if (properties.marks !== undefined) {
      next.marks = properties.marks.length > 0 ? properties.marks : undefined;
    }
    if (properties.text !== undefined) {
      next.text = properties.text;
    }
    return next;
  }
  const next: OraElement = { ...node };
  if (properties.type !== undefined) {
    next.type = properties.type;
  }
  if (properties.attrs !== undefined) {
    next.attrs = Object.keys(properties.attrs).length > 0 ? properties.attrs : undefined;
  }
  return next;
}

function splitNode(
  doc: OraDocument,
  path: number[],
  position: number,
  properties?: { type?: string; attrs?: Record<string, unknown>; marks?: OraText["marks"] },
): OraDocument {
  const node = getNode(doc, path);
  if (isText(node)) {
    const left: OraText = { type: "text", text: node.text.slice(0, position), marks: node.marks };
    const right: OraText = {
      type: "text",
      text: node.text.slice(position),
      marks: properties?.marks ?? node.marks,
    };
    if (!left.marks?.length) {
      delete left.marks;
    }
    if (!right.marks?.length) {
      delete right.marks;
    }
    let next = updateNode(doc, path, () => left);
    const rightPath = path.slice();
    const last = rightPath.length - 1;
    const index = rightPath[last];
    if (index !== undefined) {
      rightPath[last] = index + 1;
    }
    next = insertNodeAt(next, rightPath, right);
    return next;
  }

  const content = node.content ?? [];
  const leftContent = content.slice(0, position);
  const rightContent = content.slice(position);
  const left: OraElement = { ...node, content: leftContent };
  const right: OraElement = {
    type: properties?.type ?? node.type,
    attrs: properties?.attrs ?? node.attrs,
    content: rightContent,
  };
  let next = updateNode(doc, path, () => left);
  const rightPath = path.slice();
  const last = rightPath.length - 1;
  const index = rightPath[last];
  if (index !== undefined) {
    rightPath[last] = index + 1;
  }
  return insertNodeAt(next, rightPath, right);
}

function mergeNode(doc: OraDocument, path: number[]): OraDocument {
  const node = cloneNode(getNode(doc, path));
  const prevPath = pathPrevious(path);
  const prev = getNode(doc, prevPath);
  let next = updateNode(doc, prevPath, () => {
    if (isText(prev) && isText(node)) {
      return { ...prev, text: prev.text + node.text };
    }
    if (isElement(prev) && isElement(node)) {
      return { ...prev, content: [...(prev.content ?? []), ...(node.content ?? [])] };
    }
    throw new Error("Fusion de nœuds incompatibles.");
  });
  next = removeNodeAt(next, path).doc;
  return next;
}

export { pathIndex, pathParent };
