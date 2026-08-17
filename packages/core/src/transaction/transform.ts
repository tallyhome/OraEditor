import type { OraDocument, OraElement, OraMark, OraNode, OraText, Path, Point } from "../document/types.js";
import { cloneNode, emptyParagraph, emptyText, isElement, isText } from "../document/types.js";
import { getNode, getParent, hasNode, nodeLength, textContent } from "../document/node.js";
import { pathEquals, pathIndex, pathNext, pathParent, pathPrevious } from "../document/path.js";
import { pointEquals } from "../document/point.js";
import { addMarkIn, hasMark, marksEqual, removeMarkIn, toggleMarkIn } from "../document/marks.js";
import { emptyTable, isAtomicBlock, isListItem, isTable, isTextBlock } from "../document/blocks.js";
import { blockIndent, listLevel, listOrdered } from "../document/schema.js";
import { nextNormalizeOp } from "../document/normalize.js";
import { linkRangeAt } from "../document/linkRange.js";
import { isSafeUrl } from "../security/urls.js";
import type { Selection, TextSelection } from "../selection/types.js";
import { collapsed, isCollapsed, isTextSelection, selectionEdges } from "../selection/types.js";
import { applyOperation } from "./apply.js";
import { invertOperation } from "./invert.js";
import type { Operation } from "./types.js";

export interface EditorSnapshot {
  doc: OraDocument;
  selection: Selection;
  storedMarks: OraMark[] | null;
}

export class Transform {
  doc: OraDocument;
  selection: Selection;
  storedMarks: OraMark[] | null;
  ops: Operation[] = [];
  inverses: Operation[] = [];
  readonly selectionBefore: Selection;

  constructor(state: EditorSnapshot) {
    this.doc = state.doc;
    this.selection = state.selection;
    this.storedMarks = state.storedMarks;
    this.selectionBefore = state.selection;
  }

  applyOp(op: Operation): this {
    const inverse = invertOperation(this.doc, this.selection, op);
    const result = applyOperation(this.doc, this.selection, op);
    this.doc = result.doc;
    this.selection = result.selection;
    this.ops.push(op);
    this.inverses.push(inverse);
    return this;
  }

  normalize(): this {
    let guard = 0;
    while (guard < 200) {
      const op = nextNormalizeOp(this.doc);
      if (!op) {
        break;
      }
      this.applyOp(op);
      guard += 1;
    }
    return this;
  }

  setSelection(next: Selection): this {
    this.applyOp({
      type: "set_selection",
      properties: this.selection,
      newProperties: next,
    });
    return this;
  }

  insertText(text: string): this {
    if (text.length === 0) {
      return this;
    }
    if (isTextSelection(this.selection) && !isCollapsed(this.selection)) {
      this.deleteSelection();
    }
    if (!isTextSelection(this.selection)) {
      return this;
    }
    const point = this.selection.anchor;
    if (!hasNode(this.doc, point.path)) {
      return this;
    }
    const node = getNode(this.doc, point.path);
    if (!isText(node)) {
      return this;
    }
    const marks = this.storedMarks ?? node.marks;
    if (!marksEqual(marks ?? [], node.marks ?? [])) {
      this.insertMarkedText(point, text, marks ?? []);
    } else {
      this.applyOp({ type: "insert_text", path: point.path, offset: point.offset, text });
    }
    this.storedMarks = null;
    return this.normalize();
  }

  deleteSelection(): this {
    if (!isTextSelection(this.selection) || isCollapsed(this.selection)) {
      return this;
    }
    const { start, end } = selectionEdges(this.selection);
    this.deleteRange(start, end);
    this.storedMarks = null;
    return this.normalize();
  }

  deleteBackward(): this {
    if (this.selection.type === "node") {
      return this.removeBlockAt(this.selection.path[0] ?? 0);
    }
    if (!isTextSelection(this.selection)) {
      return this;
    }
    if (!isCollapsed(this.selection)) {
      return this.deleteSelection();
    }
    const point = this.selection.anchor;
    if (!hasNode(this.doc, point.path)) {
      return this;
    }
    const node = getNode(this.doc, point.path);
    if (!isText(node)) {
      return this;
    }
    if (point.offset > 0) {
      const from = previousCharOffset(node.text, point.offset);
      const removed = node.text.slice(from, point.offset);
      this.applyOp({ type: "remove_text", path: point.path, offset: from, text: removed });
      return this.normalize();
    }
    if (pathIndex(point.path) > 0) {
      const prevPath = pathPrevious(point.path);
      const prev = getNode(this.doc, prevPath);
      if (isText(prev)) {
        if (prev.text.length === 0) {
          this.applyOp({ type: "remove_node", path: prevPath, node: prev });
          return this.normalize();
        }
        const from = previousCharOffset(prev.text, prev.text.length);
        const removed = prev.text.slice(from);
        this.applyOp({ type: "remove_text", path: prevPath, offset: from, text: removed });
        this.setSelection(collapsed({ path: prevPath, offset: from }));
        return this.normalize();
      }
    }
    if ((point.path.length ?? 0) > 2) {
      return this.normalize();
    }
    const blockIndex = point.path[0] ?? 0;
    if (blockIndex > 0) {
      const prevBlock = getNode(this.doc, [blockIndex - 1]);
      const prevLen = nodeLength(prevBlock);
      const joinPath = lastTextPath(this.doc, blockIndex - 1) ?? [blockIndex - 1, Math.max(0, prevLen - 1)];
      const joinNode = getNode(this.doc, joinPath);
      const offset = isText(joinNode) ? joinNode.text.length : 0;
      this.applyOp({
        type: "merge_node",
        path: [blockIndex],
        position: prevLen,
        properties: { type: getNode(this.doc, [blockIndex]).type },
      });
      this.setSelection(collapsed({ path: joinPath, offset }));
    }
    return this.normalize();
  }

  deleteForward(): this {
    if (!isTextSelection(this.selection)) {
      return this;
    }
    if (!isCollapsed(this.selection)) {
      return this.deleteSelection();
    }
    const point = this.selection.anchor;
    const node = getNode(this.doc, point.path);
    if (!isText(node)) {
      return this;
    }
    if (point.offset < node.text.length) {
      const to = nextCharOffset(node.text, point.offset);
      const removed = node.text.slice(point.offset, to);
      this.applyOp({ type: "remove_text", path: point.path, offset: point.offset, text: removed });
      return this.normalize();
    }
    const parent = getParent(this.doc, point.path);
    const index = pathIndex(point.path);
    if (index < (parent.content?.length ?? 0) - 1) {
      const nextPath = pathNext(point.path);
      const next = getNode(this.doc, nextPath);
      if (isText(next) && next.text.length > 0) {
        const to = nextCharOffset(next.text, 0);
        this.applyOp({ type: "remove_text", path: nextPath, offset: 0, text: next.text.slice(0, to) });
        return this.normalize();
      }
    }
    const blockIndex = point.path[0] ?? 0;
    if (blockIndex < this.doc.content.length - 1) {
      const currLen = nodeLength(getNode(this.doc, [blockIndex]));
      this.applyOp({
        type: "merge_node",
        path: [blockIndex + 1],
        position: currLen,
        properties: { type: getNode(this.doc, [blockIndex + 1]).type },
      });
    }
    return this.normalize();
  }

  splitBlock(): this {
    if (isTextSelection(this.selection) && this.selection.anchor.path.length > 2) {
      return this.insertText("\n");
    }
    if (isTextSelection(this.selection) && !isCollapsed(this.selection)) {
      this.deleteSelection();
    }
    if (!isTextSelection(this.selection)) {
      return this;
    }
    let point = this.selection.anchor;
    const text = getNode(this.doc, point.path);
    if (!isText(text)) {
      return this;
    }
    if (point.offset > 0 && point.offset < text.text.length) {
      this.applyOp({ type: "split_node", path: point.path, position: point.offset, properties: { marks: text.marks } });
      point = { path: pathNext(point.path), offset: 0 };
    }
    const blockPath = pathParent(point.path);
    const childIndex = pathIndex(point.path);
    const block = getNode(this.doc, blockPath);
    if (isListItem(block) && isBlockEmpty(block)) {
      const level = listLevel(block);
      if (level > 0) {
        this.applyOp({
          type: "set_node",
          path: blockPath,
          properties: { type: block.type, attrs: block.attrs },
          newProperties: {
            type: "listItem",
            attrs: { ...presentationAttrs(block), ordered: listOrdered(block), level: level - 1 },
          },
        });
        return this.normalize();
      }
      this.applyOp({
        type: "set_node",
        path: blockPath,
        properties: { type: block.type, attrs: block.attrs },
        newProperties: { type: "paragraph", attrs: presentationAttrs(block) },
      });
      return this.normalize();
    }
    const splitAt = point.offset === 0 ? childIndex : childIndex + 1;
    this.applyOp({
      type: "split_node",
      path: blockPath,
      position: splitAt,
      properties: { type: block.type, attrs: "attrs" in block ? block.attrs : undefined },
    });
    this.storedMarks = null;
    this.normalize();
    this.setSelection(collapsed({ path: [...pathNext(blockPath), 0], offset: 0 }));
    return this;
  }

  setBlockType(type: string, attrs?: Record<string, unknown>): this {
    if (!isTextSelection(this.selection)) {
      return this;
    }
    const { start, end } = selectionEdges(this.selection);
    const from = start.path[0] ?? 0;
    const to = end.path[0] ?? from;
    for (let i = from; i <= to; i += 1) {
      const block = getNode(this.doc, [i]);
      if (!isElement(block)) {
        continue;
      }
      this.applyOp({
        type: "set_node",
        path: [i],
        properties: { type: block.type, attrs: block.attrs },
        newProperties: { type, attrs: nextBlockAttrs(block, type, attrs) },
      });
    }
    return this.normalize();
  }

  toggleList(ordered: boolean): this {
    if (!isTextSelection(this.selection)) {
      return this;
    }
    const { start, end } = selectionEdges(this.selection);
    const from = start.path[0] ?? 0;
    const to = end.path[0] ?? from;
    let allSame = true;
    for (let i = from; i <= to; i += 1) {
      const block = getNode(this.doc, [i]);
      if (!isListItem(block) || listOrdered(block) !== ordered) {
        allSame = false;
        break;
      }
    }
    return this.setBlockType(allSame ? "paragraph" : "listItem", allSame ? {} : { ordered });
  }

  setAlign(align: "left" | "center" | "right" | "justify"): this {
    return this.patchBlockAttrs({ align });
  }

  setLineHeight(value: string): this {
    return this.patchBlockAttrs({ lineHeight: value });
  }

  indent(): this {
    return this.changeIndent(1);
  }

  outdent(): this {
    return this.changeIndent(-1);
  }

  setLink(href: string, extra?: { target?: string; rel?: string[] }): this {
    if (!isSafeUrl(href)) {
      return this;
    }
    this.expandLinkRange();
    const mark: OraMark = {
      type: "link",
      href,
      ...(extra?.target === "_blank" ? { target: "_blank" } : {}),
      ...(extra?.rel && extra.rel.length > 0 ? { rel: extra.rel } : {}),
    };
    return this.applyMark(mark);
  }

  unsetLink(): this {
    this.expandLinkRange();
    return this.removeMark("link");
  }

  expandLinkRange(): this {
    const range = linkRangeAt(this.doc, this.selection);
    if (!range) {
      return this;
    }
    return this.setSelection({ type: "text", anchor: range.start, focus: range.end });
  }

  applyMark(mark: OraMark): this {
    if (!isTextSelection(this.selection)) {
      return this;
    }
    if (isCollapsed(this.selection)) {
      const path = this.selection.anchor.path;
      const node = hasNode(this.doc, path) ? getNode(this.doc, path) : undefined;
      if (node && isText(node) && node.text.length > 0) {
        this.setSelection({
          type: "text",
          anchor: { path, offset: 0 },
          focus: { path, offset: node.text.length },
        });
      } else {
        const current = this.storedMarks ?? activeMarksAt(this.doc, this.selection.anchor);
        this.storedMarks = addMarkIn(current, mark);
        return this;
      }
    }
    const edges = selectionEdges(this.selection);
    this.splitRangeEdges(edges.start, edges.end);
    const { start, end } = selectionEdges(this.selection as TextSelection);
    for (const path of textPathsInRange(this.doc, start, end)) {
      const node = getNode(this.doc, path);
      if (!isText(node)) {
        continue;
      }
      this.applyOp({
        type: "set_node",
        path,
        properties: { marks: node.marks },
        newProperties: { marks: addMarkIn(node.marks, mark) },
      });
    }
    return this.normalize();
  }

  removeMark(type: OraMark["type"]): this {
    if (!isTextSelection(this.selection)) {
      return this;
    }
    if (isCollapsed(this.selection)) {
      const current = this.storedMarks ?? activeMarksAt(this.doc, this.selection.anchor);
      this.storedMarks = removeMarkIn(current, type);
      return this;
    }
    const edges = selectionEdges(this.selection);
    this.splitRangeEdges(edges.start, edges.end);
    const { start, end } = selectionEdges(this.selection as TextSelection);
    for (const path of textPathsInRange(this.doc, start, end)) {
      const node = getNode(this.doc, path);
      if (!isText(node)) {
        continue;
      }
      this.applyOp({
        type: "set_node",
        path,
        properties: { marks: node.marks },
        newProperties: { marks: removeMarkIn(node.marks, type) },
      });
    }
    return this.normalize();
  }

  insertFragment(fragment: OraDocument | OraNode[]): this {
    const blocks = (Array.isArray(fragment) ? fragment : fragment.content).filter(isElement);
    if (blocks.length === 0) {
      return this;
    }
    if (isTextSelection(this.selection) && !isCollapsed(this.selection)) {
      this.deleteSelection();
    }
    if (!isTextSelection(this.selection)) {
      return this;
    }
    if (blocks.length === 1) {
      const block = blocks[0];
      if (block && (isAtomicBlock(block) || isTable(block))) {
        return this.insertBlock(block);
      }
      if (block && isTextBlock(block)) {
        for (const child of block.content ?? []) {
          if (!isText(child) || child.text.length === 0) {
            continue;
          }
          this.storedMarks = child.marks ?? [];
          this.insertText(child.text);
        }
        return this;
      }
    }
    this.splitBlock();
    if (!isTextSelection(this.selection)) {
      return this;
    }
    const insertIndex = this.selection.anchor.path[0] ?? 0;
    for (let i = 0; i < blocks.length; i += 1) {
      const node = blocks[i];
      if (!node) {
        continue;
      }
      this.applyOp({ type: "insert_node", path: [insertIndex + i], node: cloneNode(node) });
    }
    const lastIndex = insertIndex + blocks.length - 1;
    const lastPath = lastTextPath(this.doc, lastIndex);
    if (lastPath) {
      const last = getNode(this.doc, lastPath);
      this.setSelection(collapsed({ path: lastPath, offset: isText(last) ? last.text.length : 0 }));
    }
    return this.normalize();
  }

  insertBlock(node: OraElement): this {
    if (isTextSelection(this.selection) && !isCollapsed(this.selection)) {
      this.deleteSelection();
    }
    const index = isTextSelection(this.selection)
      ? (this.selection.anchor.path[0] ?? 0)
      : this.selection.type === "node"
        ? (this.selection.path[0] ?? 0)
        : 0;
    const current = hasNode(this.doc, [index]) ? getNode(this.doc, [index]) : null;
    if (current && isElement(current) && isTextBlock(current) && isBlockEmpty(current)) {
      this.applyOp({ type: "remove_node", path: [index], node: current });
      this.applyOp({ type: "insert_node", path: [index], node: cloneNode(node) });
    } else {
      this.applyOp({ type: "insert_node", path: [index + 1], node: cloneNode(node) });
    }
    const insertedAt = current && isElement(current) && isTextBlock(current) && isBlockEmpty(current) ? index : index + 1;
    if (isAtomicBlock(node) || isTable(node)) {
      const after = insertedAt + 1;
      if (!hasNode(this.doc, [after])) {
        this.applyOp({ type: "insert_node", path: [after], node: emptyParagraph() });
      }
      this.setSelection(collapsed({ path: [after, 0], offset: 0 }));
    }
    return this.normalize();
  }

  setNodeAttrs(path: number[], patch: Record<string, unknown>): this {
    if (!hasNode(this.doc, path)) {
      return this;
    }
    const node = getNode(this.doc, path);
    if (!isElement(node)) {
      return this;
    }
    this.applyOp({
      type: "set_node",
      path,
      properties: { type: node.type, attrs: node.attrs },
      newProperties: { type: node.type, attrs: { ...(node.attrs ?? {}), ...patch } },
    });
    return this.normalize();
  }

  insertTable(rows = 3, cols = 3): this {
    return this.insertBlock(emptyTable(rows, cols));
  }

  tableAddRow(): this {
    const loc = this.tableLocation();
    if (!loc) {
      return this;
    }
    const table = getNode(this.doc, [loc.table]);
    if (!isTable(table)) {
      return this;
    }
    const cols = isElement(table.content?.[0] ?? { type: "tableRow" }) ? (table.content?.[0] as OraElement).content?.length ?? 1 : 1;
    this.applyOp({
      type: "insert_node",
      path: [loc.table, loc.row + 1],
      node: { type: "tableRow", content: Array.from({ length: cols }, () => ({ type: "tableCell", content: [{ type: "text", text: "" }] })) },
    });
    return this.normalize();
  }

  tableAddColumn(): this {
    const loc = this.tableLocation();
    if (!loc) {
      return this;
    }
    const table = getNode(this.doc, [loc.table]);
    if (!isTable(table)) {
      return this;
    }
    const rowCount = table.content?.length ?? 0;
    for (let row = 0; row < rowCount; row += 1) {
      const rowNode = table.content?.[row];
      const cells = rowNode && isElement(rowNode) ? rowNode.content ?? [] : [];
      const refCell = cells[loc.col] ?? cells[0];
      const header = refCell && isElement(refCell) && refCell.attrs?.header === true;
      this.applyOp({
        type: "insert_node",
        path: [loc.table, row, loc.col + 1],
        node: {
          type: "tableCell",
          attrs: header ? { header: true } : undefined,
          content: [{ type: "text", text: "" }],
        },
      });
    }
    return this.normalize();
  }

  tableDeleteRow(): this {
    const loc = this.tableLocation();
    if (!loc) {
      return this;
    }
    const table = getNode(this.doc, [loc.table]);
    if (!isTable(table) || (table.content?.length ?? 0) <= 1) {
      return this.removeBlockAt(loc.table);
    }
    const row = getNode(this.doc, [loc.table, loc.row]);
    this.applyOp({ type: "remove_node", path: [loc.table, loc.row], node: row });
    return this.normalize();
  }

  tableDeleteColumn(): this {
    const loc = this.tableLocation();
    if (!loc) {
      return this;
    }
    const table = getNode(this.doc, [loc.table]);
    if (!isTable(table)) {
      return this;
    }
    const first = table.content?.[0];
    const cols = first && isElement(first) ? (first.content?.length ?? 0) : 0;
    if (cols <= 1) {
      return this.removeBlockAt(loc.table);
    }
    for (let row = (table.content?.length ?? 0) - 1; row >= 0; row -= 1) {
      if (!hasNode(this.doc, [loc.table, row, loc.col])) {
        continue;
      }
      const cell = getNode(this.doc, [loc.table, row, loc.col]);
      this.applyOp({ type: "remove_node", path: [loc.table, row, loc.col], node: cell });
    }
    return this.normalize();
  }

  replaceTextAt(path: number[], text: string): this {
    if (!hasNode(this.doc, path)) {
      return this;
    }
    const node = getNode(this.doc, path);
    if (!isText(node)) {
      return this;
    }
    if (node.text.length > 0) {
      this.applyOp({ type: "remove_text", path, offset: 0, text: node.text });
    }
    if (text.length > 0) {
      this.applyOp({ type: "insert_text", path, offset: 0, text });
    }
    return this.normalize();
  }

  removeBlockAt(index: number): this {
    if (!hasNode(this.doc, [index])) {
      return this;
    }
    const node = getNode(this.doc, [index]);
    this.applyOp({ type: "remove_node", path: [index], node });
    const nextIndex = Math.min(index, Math.max(0, this.doc.content.length - 1));
    const nextPath = lastTextPath(this.doc, nextIndex) ?? [nextIndex, 0];
    this.setSelection(collapsed({ path: nextPath, offset: 0 }));
    return this.normalize();
  }

  private tableLocation(): { table: number; row: number; col: number } | null {
    if (isTextSelection(this.selection) && this.selection.anchor.path.length >= 3) {
      const [table, row, col] = this.selection.anchor.path;
      if (table !== undefined && row !== undefined && col !== undefined) {
        const node = getNode(this.doc, [table]);
        if (isTable(node)) {
          return { table, row, col };
        }
      }
    }
    const hint =
      this.selection.type === "node"
        ? (this.selection.path[0] ?? 0)
        : isTextSelection(this.selection)
          ? (this.selection.anchor.path[0] ?? 0)
          : 0;
    const nearby = isTable(getNode(this.doc, [hint])) ? hint : this.doc.content.findIndex((block) => isTable(block));
    if (nearby < 0) {
      return null;
    }
    const table = getNode(this.doc, [nearby]);
    if (!isTable(table)) {
      return null;
    }
    const lastRow = Math.max(0, (table.content?.length ?? 1) - 1);
    const lastCol = Math.max(0, ((table.content?.[0] && isElement(table.content[0]) ? table.content[0].content?.length : 1) ?? 1) - 1);
    return { table: nearby, row: lastRow, col: lastCol };
  }

  private patchBlockAttrs(patch: Record<string, unknown>): this {
    if (!isTextSelection(this.selection)) {
      return this;
    }
    const { start, end } = selectionEdges(this.selection);
    const from = start.path[0] ?? 0;
    const to = end.path[0] ?? from;
    for (let i = from; i <= to; i += 1) {
      const block = getNode(this.doc, [i]);
      if (!isElement(block)) {
        continue;
      }
      const attrs = { ...(block.attrs ?? {}), ...patch };
      this.applyOp({
        type: "set_node",
        path: [i],
        properties: { type: block.type, attrs: block.attrs },
        newProperties: { type: block.type, attrs },
      });
    }
    return this.normalize();
  }

  private changeIndent(delta: number): this {
    if (!isTextSelection(this.selection)) {
      return this;
    }
    const { start, end } = selectionEdges(this.selection);
    const from = start.path[0] ?? 0;
    const to = end.path[0] ?? from;
    for (let i = from; i <= to; i += 1) {
      const block = getNode(this.doc, [i]);
      if (!isElement(block)) {
        continue;
      }
      const attrs = { ...(block.attrs ?? {}) };
      if (isListItem(block)) {
        attrs.level = Math.min(8, Math.max(0, listLevel(block) + delta));
      } else {
        attrs.indent = Math.min(8, Math.max(0, blockIndent(block) + delta));
      }
      this.applyOp({
        type: "set_node",
        path: [i],
        properties: { type: block.type, attrs: block.attrs },
        newProperties: { type: block.type, attrs },
      });
    }
    return this.normalize();
  }

  toggleMark(mark: OraMark): this {
    if (!isTextSelection(this.selection)) {
      return this;
    }
    if (isCollapsed(this.selection)) {
      const current = this.storedMarks ?? activeMarksAt(this.doc, this.selection.anchor);
      this.storedMarks = toggleMarkIn(current, mark);
      return this;
    }
    const { start, end } = selectionEdges(this.selection);
    const paths = textPathsInRange(this.doc, start, end);
    const allHave = paths.length > 0 && paths.every((path) => {
      const node = getNode(this.doc, path);
      return isText(node) && hasMark(node.marks, mark.type);
    });
    this.splitRangeEdges(start, end);
    const { start: nextStart, end: nextEnd } = selectionEdges(this.selection as TextSelection);
    const nextPaths = textPathsInRange(this.doc, nextStart, nextEnd);
    for (const path of nextPaths) {
      const node = getNode(this.doc, path);
      if (!isText(node)) {
        continue;
      }
      const marks = allHave ? removeMarkIn(node.marks, mark.type) : addMarkIn(node.marks, mark);
      this.applyOp({
        type: "set_node",
        path,
        properties: { marks: node.marks },
        newProperties: { marks },
      });
    }
    return this.normalize();
  }

  selectAll(): this {
    let lastPath: Path | null = null;
    for (let i = this.doc.content.length - 1; i >= 0; i -= 1) {
      lastPath = lastTextPath(this.doc, i);
      if (lastPath) {
        break;
      }
    }
    if (!lastPath) {
      return this;
    }
    const last = getNode(this.doc, lastPath);
    const offset = isText(last) ? last.text.length : 0;
    const firstPath = lastTextPath(this.doc, 0) ?? [0, 0];
    return this.setSelection({
      type: "text",
      anchor: { path: firstPath, offset: 0 },
      focus: { path: lastPath, offset },
    });
  }

  private insertMarkedText(point: Point, text: string, marks: OraMark[]): void {
    const node = getNode(this.doc, point.path);
    if (!isText(node)) {
      return;
    }
    const marked: OraText = marks.length > 0 ? { type: "text", text, marks } : { type: "text", text };
    if (node.text.length === 0) {
      this.applyOp({
        type: "set_node",
        path: point.path,
        properties: { marks: node.marks },
        newProperties: { marks },
      });
      this.applyOp({ type: "insert_text", path: point.path, offset: 0, text });
      return;
    }
    if (point.offset === 0) {
      this.applyOp({ type: "insert_node", path: point.path, node: marked });
      this.setSelection(collapsed({ path: point.path, offset: text.length }));
      return;
    }
    if (point.offset === node.text.length) {
      const nextPath = pathNext(point.path);
      this.applyOp({ type: "insert_node", path: nextPath, node: marked });
      this.setSelection(collapsed({ path: nextPath, offset: text.length }));
      return;
    }
    this.applyOp({ type: "split_node", path: point.path, position: point.offset, properties: { marks: node.marks } });
    const insertPath = pathNext(point.path);
    this.applyOp({ type: "insert_node", path: insertPath, node: marked });
    this.setSelection(collapsed({ path: insertPath, offset: text.length }));
  }

  private deleteRange(start: Point, end: Point): void {
    if (pointEquals(start, end)) {
      return;
    }
    if (pathEquals(start.path, end.path)) {
      const node = getNode(this.doc, start.path);
      if (!isText(node)) {
        return;
      }
      const removed = node.text.slice(start.offset, end.offset);
      this.applyOp({ type: "remove_text", path: start.path, offset: start.offset, text: removed });
      this.setSelection(collapsed(start));
      return;
    }

    const startBlock = start.path[0] ?? 0;
    const endBlock = end.path[0] ?? 0;

    if (startBlock === endBlock) {
      this.deleteWithinBlock(start, end);
      this.setSelection(collapsed(start));
      return;
    }

    this.deleteFromPointToEndOfBlock(start);
    for (let i = endBlock - 1; i > startBlock; i -= 1) {
      const block = getNode(this.doc, [i]);
      this.applyOp({ type: "remove_node", path: [i], node: block });
    }
    const shiftedEnd: Point = {
      path: remapPathAfterRemoves(end.path, startBlock + 1, endBlock - 1),
      offset: end.offset,
    };
    this.deleteFromStartOfBlockTo(shiftedEnd);
    const rightIndex = startBlock + 1;
    if (hasNode(this.doc, [rightIndex])) {
      const leftLen = nodeLength(getNode(this.doc, [startBlock]));
      this.applyOp({
        type: "merge_node",
        path: [rightIndex],
        position: leftLen,
        properties: { type: getNode(this.doc, [rightIndex]).type },
      });
    }
    this.setSelection(collapsed(start));
  }

  private deleteWithinBlock(start: Point, end: Point): void {
    if (!pathEquals(start.path, end.path)) {
      const endNode = getNode(this.doc, end.path);
      if (isText(endNode) && end.offset > 0) {
        this.applyOp({
          type: "remove_text",
          path: end.path,
          offset: 0,
          text: endNode.text.slice(0, Math.min(end.offset, endNode.text.length)),
        });
      }
      const blockIndex = start.path[0] ?? 0;
      const startIndex = start.path[1] ?? 0;
      const endIndex = end.path[1] ?? startIndex;
      for (let i = endIndex - 1; i > startIndex; i -= 1) {
        const node = getNode(this.doc, [blockIndex, i]);
        this.applyOp({ type: "remove_node", path: [blockIndex, i], node });
      }
    }
    const startNode = getNode(this.doc, start.path);
    if (isText(startNode) && start.offset < startNode.text.length) {
      this.applyOp({
        type: "remove_text",
        path: start.path,
        offset: start.offset,
        text: startNode.text.slice(start.offset),
      });
    }
  }

  private deleteFromPointToEndOfBlock(start: Point): void {
    const blockIndex = start.path[0] ?? 0;
    const startIndex = start.path[1] ?? 0;
    const block = getNode(this.doc, [blockIndex]);
    const lastIndex = ("content" in block ? block.content?.length : 1) ?? 1;
    for (let i = lastIndex - 1; i > startIndex; i -= 1) {
      const node = getNode(this.doc, [blockIndex, i]);
      this.applyOp({ type: "remove_node", path: [blockIndex, i], node });
    }
    const startNode = getNode(this.doc, start.path);
    if (isText(startNode) && start.offset < startNode.text.length) {
      this.applyOp({
        type: "remove_text",
        path: start.path,
        offset: start.offset,
        text: startNode.text.slice(start.offset),
      });
    }
  }

  private deleteFromStartOfBlockTo(end: Point): void {
    const blockIndex = end.path[0] ?? 0;
    const endIndex = end.path[1] ?? 0;
    const endNode = getNode(this.doc, end.path);
    if (isText(endNode) && end.offset > 0) {
      this.applyOp({
        type: "remove_text",
        path: end.path,
        offset: 0,
        text: endNode.text.slice(0, Math.min(end.offset, endNode.text.length)),
      });
    }
    for (let i = endIndex - 1; i >= 0; i -= 1) {
      const node = getNode(this.doc, [blockIndex, i]);
      this.applyOp({ type: "remove_node", path: [blockIndex, i], node });
    }
  }

  private splitRangeEdges(start: Point, end: Point): void {
    if (!pathEquals(start.path, end.path)) {
      const endNode = getNode(this.doc, end.path);
      if (isText(endNode) && end.offset > 0 && end.offset < endNode.text.length) {
        this.applyOp({ type: "split_node", path: end.path, position: end.offset, properties: { marks: endNode.marks } });
      }
      const startNode = getNode(this.doc, start.path);
      if (isText(startNode) && start.offset > 0 && start.offset < startNode.text.length) {
        this.applyOp({ type: "split_node", path: start.path, position: start.offset, properties: { marks: startNode.marks } });
      }
      return;
    }
    const node = getNode(this.doc, start.path);
    if (!isText(node)) {
      return;
    }
    if (end.offset < node.text.length) {
      this.applyOp({ type: "split_node", path: start.path, position: end.offset, properties: { marks: node.marks } });
    }
    const left = getNode(this.doc, start.path);
    if (isText(left) && start.offset > 0 && start.offset < left.text.length) {
      this.applyOp({ type: "split_node", path: start.path, position: start.offset, properties: { marks: left.marks } });
    }
  }
}

export function activeMarksAt(doc: OraDocument, point: Point): OraMark[] {
  const node = getNode(doc, point.path);
  return isText(node) ? (node.marks ?? []) : [];
}

export function textPathsInRange(doc: OraDocument, start: Point, end: Point): Path[] {
  const paths: Path[] = [];
  const startBlock = start.path[0] ?? 0;
  const endBlock = end.path[0] ?? startBlock;
  for (let b = startBlock; b <= endBlock; b += 1) {
    const block = getNode(doc, [b]);
    const children = "content" in block ? (block.content ?? []) : [];
    children.forEach((child, index) => {
      if (!isText(child)) {
        return;
      }
      const path = [b, index];
      if (b === startBlock && index < (start.path[1] ?? 0)) {
        return;
      }
      if (b === endBlock && index > (end.path[1] ?? 0)) {
        return;
      }
      paths.push(path);
    });
  }
  return paths;
}

export function lastTextPath(doc: OraDocument, blockIndex: number): Path | null {
  const block = doc.content[blockIndex];
  if (!block || !isElement(block)) {
    return null;
  }
  if (isTable(block)) {
    const rows = block.content ?? [];
    const lastRow = rows[rows.length - 1];
    if (!lastRow || !isElement(lastRow)) {
      return null;
    }
    const cells = lastRow.content ?? [];
    const lastCell = cells[cells.length - 1];
    if (!lastCell || !isElement(lastCell) || !lastCell.content?.length) {
      return null;
    }
    return [blockIndex, rows.length - 1, cells.length - 1, lastCell.content.length - 1];
  }
  if (!block.content || block.content.length === 0) {
    return null;
  }
  return [blockIndex, block.content.length - 1];
}

function remapPathAfterRemoves(path: Path, removeFrom: number, removeTo: number): Path {
  if (removeTo < removeFrom) {
    return path;
  }
  const removed = removeTo - removeFrom + 1;
  const block = path[0] ?? 0;
  if (block > removeTo) {
    return [block - removed, ...path.slice(1)];
  }
  return path;
}

function previousCharOffset(text: string, offset: number): number {
  if (offset <= 0) {
    return 0;
  }
  const prefix = [...text.slice(0, offset)];
  prefix.pop();
  return prefix.join("").length;
}

function nextCharOffset(text: string, offset: number): number {
  if (offset >= text.length) {
    return text.length;
  }
  const suffix = [...text.slice(offset)];
  const first = suffix[0] ?? "";
  return offset + first.length;
}

function isBlockEmpty(node: OraNode): boolean {
  return textContent(node).trim() === "";
}

function presentationAttrs(block: OraElement): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  const align = block.attrs?.align;
  if (align === "left" || align === "center" || align === "right" || align === "justify") {
    attrs.align = align;
  }
  if (typeof block.attrs?.indent === "number" && block.attrs.indent > 0) {
    attrs.indent = block.attrs.indent;
  }
  if (typeof block.attrs?.lineHeight === "string") {
    attrs.lineHeight = block.attrs.lineHeight;
  }
  return attrs;
}

function nextBlockAttrs(block: OraElement, type: string, patch?: Record<string, unknown>): Record<string, unknown> {
  const attrs = { ...presentationAttrs(block), ...(patch ?? {}) };
  if (type === "heading") {
    const level = typeof attrs.level === "number" ? attrs.level : block.type === "heading" && typeof block.attrs?.level === "number" ? block.attrs.level : 1;
    attrs.level = Math.min(6, Math.max(1, Math.round(level)));
    delete attrs.ordered;
  } else if (type === "listItem") {
    attrs.ordered = attrs.ordered === true;
    const level = typeof attrs.level === "number" ? attrs.level : block.type === "listItem" ? listLevel(block) : 0;
    attrs.level = Math.min(8, Math.max(0, Math.round(level)));
  } else {
    delete attrs.level;
    delete attrs.ordered;
  }
  return attrs;
}

export { emptyParagraph, emptyText, pathParent };
