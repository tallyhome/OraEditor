export type Path = number[];

export interface Point {
  path: Path;
  offset: number;
}

export type OraMark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "underline" }
  | { type: "strike" }
  | { type: "code" }
  | { type: "subscript" }
  | { type: "superscript" }
  | { type: "color"; value: string }
  | { type: "background"; value: string }
  | { type: "fontSize"; value: string }
  | { type: "fontFamily"; value: string }
  | { type: "link"; href: string; target?: string; rel?: string[] };

export interface OraText {
  type: "text";
  text: string;
  marks?: OraMark[];
}

export interface OraElement {
  type: string;
  attrs?: Record<string, unknown>;
  content?: OraNode[];
}

export type OraNode = OraText | OraElement;

export interface OraDocument {
  version: number;
  type: "doc";
  content: OraNode[];
}

export function isText(node: OraNode): node is OraText {
  return node.type === "text";
}

export function isElement(node: OraNode): node is OraElement {
  return node.type !== "text";
}

export function cloneNode<T extends OraNode | OraDocument>(node: T): T {
  return structuredClone(node);
}

export function emptyText(marks?: OraMark[]): OraText {
  return marks && marks.length > 0 ? { type: "text", text: "", marks } : { type: "text", text: "" };
}

export function emptyParagraph(): OraElement {
  return { type: "paragraph", content: [emptyText()] };
}

export function createEmptyDocument(): OraDocument {
  return {
    version: 1,
    type: "doc",
    content: [emptyParagraph()],
  };
}

export function asElement(doc: OraDocument): OraElement {
  return { type: "doc", content: doc.content };
}
