import type { OraElement, OraMark } from "./types.js";

export type BlockContent = "block+" | "inline*" | "none" | "table";

export interface BlockSpec {
  type: string;
  content: BlockContent;
  attrs?: Record<string, unknown>;
}

export interface MarkSpec {
  type: OraMark["type"];
}

export const TEXT_BLOCK_TYPES = ["paragraph", "heading", "blockquote", "codeBlock", "listItem"] as const;
export type TextBlockType = (typeof TEXT_BLOCK_TYPES)[number];

export class Schema {
  readonly blocks = new Map<string, BlockSpec>();
  readonly marks = new Map<string, MarkSpec>();

  registerBlock(spec: BlockSpec): void {
    this.blocks.set(spec.type, spec);
  }

  registerMark(spec: MarkSpec): void {
    this.marks.set(spec.type, spec);
  }

  isBlock(type: string): boolean {
    return this.blocks.has(type) || type === "doc";
  }

  isInlineBlock(type: string): boolean {
    return this.blocks.get(type)?.content === "inline*";
  }

  allowMark(type: string): boolean {
    return this.marks.has(type);
  }

  static createDefault(): Schema {
    const schema = new Schema();
    schema.registerBlock({ type: "doc", content: "block+" });
    schema.registerBlock({ type: "paragraph", content: "inline*" });
    schema.registerBlock({ type: "heading", content: "inline*", attrs: { level: 1 } });
    schema.registerBlock({ type: "blockquote", content: "inline*" });
    schema.registerBlock({ type: "codeBlock", content: "inline*" });
    schema.registerBlock({ type: "listItem", content: "inline*", attrs: { ordered: false, level: 0 } });
    schema.registerBlock({ type: "image", content: "none" });
    schema.registerBlock({ type: "video", content: "none" });
    schema.registerBlock({ type: "audio", content: "none" });
    schema.registerBlock({ type: "embed", content: "none" });
    schema.registerBlock({ type: "table", content: "table" });
    schema.registerBlock({ type: "tableRow", content: "table" });
    schema.registerBlock({ type: "tableCell", content: "inline*" });
    for (const type of [
      "bold",
      "italic",
      "underline",
      "strike",
      "code",
      "subscript",
      "superscript",
      "color",
      "background",
      "fontSize",
      "fontFamily",
      "link",
    ] as const) {
      schema.registerMark({ type });
    }
    return schema;
  }
}

export function headingLevel(node: OraElement): number {
  const level = node.attrs?.level;
  if (typeof level === "number" && level >= 1 && level <= 6) {
    return level;
  }
  return 1;
}

export function isTextBlockType(type: string): type is TextBlockType {
  return (TEXT_BLOCK_TYPES as readonly string[]).includes(type);
}

export function blockAlign(node: OraElement): "left" | "center" | "right" | "justify" | undefined {
  const align = node.attrs?.align;
  if (align === "left" || align === "center" || align === "right" || align === "justify") {
    return align;
  }
  return undefined;
}

export function blockIndent(node: OraElement): number {
  const indent = node.attrs?.indent;
  return typeof indent === "number" ? Math.min(8, Math.max(0, Math.round(indent))) : 0;
}

export function blockLineHeight(node: OraElement): string | undefined {
  return typeof node.attrs?.lineHeight === "string" ? node.attrs.lineHeight : undefined;
}

export function listLevel(node: OraElement): number {
  const level = node.attrs?.level;
  return typeof level === "number" ? Math.min(8, Math.max(0, Math.round(level))) : 0;
}

export function listOrdered(node: OraElement): boolean {
  return node.attrs?.ordered === true;
}
