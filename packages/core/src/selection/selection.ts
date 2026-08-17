import type { Selection } from "./types.js";
import { collapsed, isTextSelection } from "./types.js";
import type { Operation } from "../transaction/types.js";
import { transformPath, transformPoint } from "../transaction/mapping.js";

export function mapSelection(selection: Selection, op: Operation): Selection | null {
  if (op.type === "set_selection") {
    return op.newProperties ?? selection;
  }

  if (isTextSelection(selection)) {
    const anchor = transformPoint(selection.anchor, op);
    const focus = transformPoint(selection.focus, op);
    if (!anchor || !focus) {
      return collapsed({ path: [0, 0], offset: 0 });
    }
    return { type: "text", anchor, focus };
  }

  if (selection.type === "node") {
    const path = transformPath(selection.path, op);
    return path ? { type: "node", path } : null;
  }

  const anchor = transformPath(selection.anchor, op);
  const focus = transformPath(selection.focus, op);
  if (!anchor || !focus) {
    return null;
  }
  return { type: "cell", anchor, focus };
}
