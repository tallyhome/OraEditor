import type { Path, Point } from "../document/types.js";
import { pathEquals, pathCompare } from "../document/path.js";
import { pointCompare, pointEquals } from "../document/point.js";

export interface TextSelection {
  type: "text";
  anchor: Point;
  focus: Point;
}

export interface NodeSelection {
  type: "node";
  path: Path;
}

export interface CellSelection {
  type: "cell";
  anchor: Path;
  focus: Path;
}

export type Selection = TextSelection | NodeSelection | CellSelection;

export function isTextSelection(selection: Selection): selection is TextSelection {
  return selection.type === "text";
}

export function isCellSelection(selection: Selection): selection is CellSelection {
  return selection.type === "cell";
}

export function collapsed(point: Point): TextSelection {
  return { type: "text", anchor: point, focus: point };
}

export function isCollapsed(selection: Selection): boolean {
  if (!isTextSelection(selection)) {
    return false;
  }
  return pointEquals(selection.anchor, selection.focus);
}

export function selectionEdges(selection: TextSelection): { start: Point; end: Point } {
  if (pointCompare(selection.anchor, selection.focus) <= 0) {
    return { start: selection.anchor, end: selection.focus };
  }
  return { start: selection.focus, end: selection.anchor };
}

export function initialSelection(): TextSelection {
  return collapsed({ path: [0, 0], offset: 0 });
}

export function selectionEquals(a: Selection, b: Selection): boolean {
  if (a.type !== b.type) {
    return false;
  }
  if (a.type === "text" && b.type === "text") {
    return pointEquals(a.anchor, b.anchor) && pointEquals(a.focus, b.focus);
  }
  if (a.type === "node" && b.type === "node") {
    return pathEquals(a.path, b.path);
  }
  if (a.type === "cell" && b.type === "cell") {
    return pathEquals(a.anchor, b.anchor) && pathEquals(a.focus, b.focus);
  }
  return false;
}

export function rangeSpansBlocks(selection: TextSelection): boolean {
  const { start, end } = selectionEdges(selection);
  return start.path[0] !== end.path[0];
}

export { pathCompare };
