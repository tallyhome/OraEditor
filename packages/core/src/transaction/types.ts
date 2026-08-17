import type { OraMark, OraNode, Path } from "../document/types.js";
import type { Selection } from "../selection/types.js";

export type InsertTextOperation = {
  type: "insert_text";
  path: Path;
  offset: number;
  text: string;
};

export type RemoveTextOperation = {
  type: "remove_text";
  path: Path;
  offset: number;
  text: string;
};

export type InsertNodeOperation = {
  type: "insert_node";
  path: Path;
  node: OraNode;
};

export type RemoveNodeOperation = {
  type: "remove_node";
  path: Path;
  node: OraNode;
};

export type SetNodeOperation = {
  type: "set_node";
  path: Path;
  properties: {
    type?: string;
    attrs?: Record<string, unknown>;
    marks?: OraMark[];
    text?: string;
  };
  newProperties: {
    type?: string;
    attrs?: Record<string, unknown>;
    marks?: OraMark[];
    text?: string;
  };
};

export type SplitNodeOperation = {
  type: "split_node";
  path: Path;
  position: number;
  properties?: {
    type?: string;
    attrs?: Record<string, unknown>;
    marks?: OraMark[];
  };
};

export type MergeNodeOperation = {
  type: "merge_node";
  path: Path;
  position: number;
  properties: {
    type?: string;
    attrs?: Record<string, unknown>;
    marks?: OraMark[];
  };
};

export type SetSelectionOperation = {
  type: "set_selection";
  properties: Selection | null;
  newProperties: Selection | null;
};

export type Operation =
  | InsertTextOperation
  | RemoveTextOperation
  | InsertNodeOperation
  | RemoveNodeOperation
  | SetNodeOperation
  | SplitNodeOperation
  | MergeNodeOperation
  | SetSelectionOperation;
