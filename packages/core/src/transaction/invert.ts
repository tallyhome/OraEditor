import type { OraDocument } from "../document/types.js";
import { getNode, isText } from "../document/index.js";
import { pathNext, pathPrevious } from "../document/path.js";
import type { Selection } from "../selection/types.js";
import type { Operation } from "./types.js";

export function invertOperation(doc: OraDocument, selection: Selection, op: Operation): Operation {
  switch (op.type) {
    case "insert_text":
      return { type: "remove_text", path: op.path, offset: op.offset, text: op.text };
    case "remove_text":
      return { type: "insert_text", path: op.path, offset: op.offset, text: op.text };
    case "insert_node":
      return { type: "remove_node", path: op.path, node: op.node };
    case "remove_node":
      return { type: "insert_node", path: op.path, node: op.node };
    case "set_node":
      return { type: "set_node", path: op.path, properties: op.newProperties, newProperties: op.properties };
    case "split_node":
      return {
        type: "merge_node",
        path: pathNext(op.path),
        position: op.position,
        properties: op.properties ?? {},
      };
    case "merge_node":
      return {
        type: "split_node",
        path: pathPrevious(op.path),
        position: op.position,
        properties: op.properties,
      };
    case "set_selection":
      return { type: "set_selection", properties: op.newProperties, newProperties: op.properties ?? selection };
    default:
      return op;
  }
}

export function currentNodeSnapshot(doc: OraDocument, path: number[]): {
  type?: string;
  attrs?: Record<string, unknown>;
  marks?: import("../document/types.js").OraMark[];
} {
  const node = getNode(doc, path);
  if (isText(node)) {
    return { marks: node.marks };
  }
  return { type: node.type, attrs: node.attrs };
}
