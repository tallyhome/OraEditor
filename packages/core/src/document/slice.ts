import type { OraDocument, OraElement, OraNode, Point } from "./types.js";
import { cloneNode, isElement, isText } from "./types.js";
import { pathEquals } from "./path.js";
import type { TextSelection } from "../selection/types.js";
import { selectionEdges } from "../selection/types.js";
import { toHTML } from "./html.js";

export function selectedHTML(doc: OraDocument, selection: TextSelection): string {
  const fragment = selectedFragment(doc, selection);
  if (!fragment) {
    return "";
  }
  return toHTML(fragment);
}

export function selectedFragment(doc: OraDocument, selection: TextSelection): OraDocument | null {
  const { start, end } = selectionEdges(selection);
  if (pathEquals(start.path, end.path) && start.offset === end.offset) {
    return null;
  }
  const startBlock = start.path[0] ?? 0;
  const endBlock = end.path[0] ?? startBlock;
  const blocks: OraNode[] = [];
  for (let i = startBlock; i <= endBlock; i += 1) {
    const block = doc.content[i];
    if (!block || !isElement(block)) {
      continue;
    }
    if (i === startBlock && i === endBlock) {
      blocks.push(sliceBlock(block, start, end));
    } else if (i === startBlock) {
      blocks.push(sliceBlockFrom(block, start));
    } else if (i === endBlock) {
      blocks.push(sliceBlockTo(block, end));
    } else {
      blocks.push(cloneNode(block));
    }
  }
  if (blocks.length === 0) {
    return null;
  }
  return { version: 1, type: "doc", content: blocks };
}

function sliceBlock(block: OraElement, start: Point, end: Point): OraElement {
  const children = block.content ?? [];
  const fromIndex = start.path[1] ?? 0;
  const toIndex = end.path[1] ?? fromIndex;
  const content: OraNode[] = [];
  children.forEach((child, index) => {
    if (index < fromIndex || index > toIndex || !isText(child)) {
      return;
    }
    const from = index === fromIndex ? start.offset : 0;
    const to = index === toIndex ? end.offset : child.text.length;
    const text = child.text.slice(from, to);
    if (text.length > 0) {
      content.push(child.marks ? { type: "text", text, marks: child.marks } : { type: "text", text });
    }
  });
  return { ...block, content: content.length ? content : [{ type: "text", text: "" }] };
}

function sliceBlockFrom(block: OraElement, start: Point): OraElement {
  const children = block.content ?? [];
  const startIndex = start.path[1] ?? 0;
  const content: OraNode[] = [];
  children.forEach((child, index) => {
    if (index < startIndex || !isText(child)) {
      return;
    }
    const text = index === startIndex ? child.text.slice(start.offset) : child.text;
    if (text.length > 0) {
      content.push(child.marks ? { type: "text", text, marks: child.marks } : { type: "text", text });
    }
  });
  return { ...block, content: content.length ? content : [{ type: "text", text: "" }] };
}

function sliceBlockTo(block: OraElement, end: Point): OraElement {
  const children = block.content ?? [];
  const endIndex = end.path[1] ?? 0;
  const content: OraNode[] = [];
  children.forEach((child, index) => {
    if (index > endIndex || !isText(child)) {
      return;
    }
    const text = index === endIndex ? child.text.slice(0, end.offset) : child.text;
    if (text.length > 0) {
      content.push(child.marks ? { type: "text", text, marks: child.marks } : { type: "text", text });
    }
  });
  return { ...block, content: content.length ? content : [{ type: "text", text: "" }] };
}
