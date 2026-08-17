import type { OraDocument, OraMark, Point } from "./types.js";
import { isElement, isText } from "./types.js";
import { getNode } from "./node.js";
import type { Selection } from "../selection/types.js";
import { isTextSelection } from "../selection/types.js";

export type LinkMark = Extract<OraMark, { type: "link" }>;

export function linkRangeAt(
  doc: OraDocument,
  selection: Selection,
): { start: Point; end: Point; mark: LinkMark } | null {
  if (!isTextSelection(selection)) {
    return null;
  }
  const point = selection.anchor;
  const node = getNode(doc, point.path);
  if (!isText(node)) {
    return null;
  }
  const mark = node.marks?.find((item): item is LinkMark => item.type === "link");
  if (!mark) {
    return null;
  }
  const blockIndex = point.path[0] ?? 0;
  const block = getNode(doc, [blockIndex]);
  const children = isElement(block) ? (block.content ?? []) : [];
  let startIndex = point.path[1] ?? 0;
  let endIndex = startIndex;
  while (startIndex > 0) {
    const prev = children[startIndex - 1];
    if (!prev || !isText(prev) || !sameLink(prev.marks, mark)) {
      break;
    }
    startIndex -= 1;
  }
  while (endIndex < children.length - 1) {
    const next = children[endIndex + 1];
    if (!next || !isText(next) || !sameLink(next.marks, mark)) {
      break;
    }
    endIndex += 1;
  }
  const endNode = children[endIndex];
  return {
    start: { path: [blockIndex, startIndex], offset: 0 },
    end: { path: [blockIndex, endIndex], offset: endNode && isText(endNode) ? endNode.text.length : 0 },
    mark,
  };
}

function sameLink(marks: OraMark[] | undefined, mark: LinkMark): boolean {
  return marks?.some((item) => item.type === "link" && item.href === mark.href) === true;
}
