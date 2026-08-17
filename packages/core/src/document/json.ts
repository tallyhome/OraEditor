import type { OraDocument, OraElement, OraMark, OraNode } from "./types.js";
import { createEmptyDocument, isElement, isText } from "./types.js";
import { DOCUMENT_MODEL_VERSION } from "../version.js";
import { migrateDocument } from "./migrations/index.js";
import { normalizeMarks } from "./marks.js";
import { Schema } from "./schema.js";

const defaultSchema = Schema.createDefault();

export function toJSON(doc: OraDocument): OraDocument {
  return structuredClone(doc);
}

export function fromJSON(input: unknown, schema: Schema = defaultSchema): OraDocument {
  if (!input || typeof input !== "object") {
    return createEmptyDocument();
  }
  const raw = input as Record<string, unknown>;
  const version = typeof raw.version === "number" ? raw.version : DOCUMENT_MODEL_VERSION;
  const content = Array.isArray(raw.content) ? raw.content.map((node) => sanitizeNode(node, schema)).filter(Boolean) as OraNode[] : [];
  const doc: OraDocument = {
    version,
    type: "doc",
    content: content.length > 0 ? content : createEmptyDocument().content,
  };
  return migrateDocument(doc);
}

function sanitizeNode(input: unknown, schema: Schema): OraNode | null {
  if (!input || typeof input !== "object") {
    return null;
  }
  const raw = input as Record<string, unknown>;
  if (raw.type === "text") {
    const text = typeof raw.text === "string" ? raw.text : "";
    const marks = Array.isArray(raw.marks)
      ? normalizeMarks(raw.marks.map(sanitizeMark).filter((mark): mark is OraMark => mark !== null))
      : undefined;
    const allowed = marks?.filter((mark) => schema.allowMark(mark.type));
    return allowed && allowed.length > 0 ? { type: "text", text, marks: allowed } : { type: "text", text };
  }
  if (typeof raw.type !== "string") {
    return null;
  }
  const type = schema.blocks.has(raw.type) ? raw.type : "paragraph";
  const content = Array.isArray(raw.content)
    ? (raw.content.map((child) => sanitizeNode(child, schema)).filter(Boolean) as OraNode[])
    : [];
  const node: OraElement = { type, content };
  if (raw.attrs && typeof raw.attrs === "object") {
    node.attrs = sanitizeAttrs(type, raw.attrs as Record<string, unknown>);
  }
  if (content.length === 0 && isElement(node) && type !== "image" && type !== "video" && type !== "audio" && type !== "embed") {
    node.content = [{ type: "text", text: "" }];
  }
  return node;
}

function sanitizeAttrs(type: string, attrs: Record<string, unknown>): Record<string, unknown> | undefined {
  const next: Record<string, unknown> = {};
  if (type === "heading") {
    const level = typeof attrs.level === "number" ? Math.min(6, Math.max(1, Math.round(attrs.level))) : 1;
    next.level = level;
  }
  if (type === "listItem") {
    next.ordered = attrs.ordered === true;
    next.level = typeof attrs.level === "number" ? Math.min(8, Math.max(0, Math.round(attrs.level))) : 0;
  }
  const align = attrs.align;
  if (align === "left" || align === "center" || align === "right" || align === "justify") {
    next.align = align;
  }
  if (typeof attrs.indent === "number") {
    next.indent = Math.min(8, Math.max(0, Math.round(attrs.indent)));
  }
  if (typeof attrs.lineHeight === "string" && /^\d+(?:\.\d+)?$/.test(attrs.lineHeight)) {
    next.lineHeight = attrs.lineHeight;
  }
  if (type === "image" || type === "video" || type === "audio" || type === "embed") {
    if (typeof attrs.src === "string") {
      next.src = attrs.src;
    }
    if (typeof attrs.alt === "string") {
      next.alt = attrs.alt;
    }
    if (typeof attrs.title === "string") {
      next.title = attrs.title;
    }
    if (typeof attrs.caption === "string") {
      next.caption = attrs.caption;
    }
    if (typeof attrs.href === "string") {
      next.href = attrs.href;
    }
    if (typeof attrs.width === "number") {
      next.width = Math.max(16, Math.round(attrs.width));
    }
    if (typeof attrs.height === "number") {
      next.height = Math.max(16, Math.round(attrs.height));
    }
    if (attrs.border === true) {
      next.border = true;
    }
    if (attrs.shadow === true) {
      next.shadow = true;
    }
    if (typeof attrs.margin === "string") {
      next.margin = attrs.margin;
    }
    if (attrs.uploading === true) {
      next.uploading = true;
    }
  }
  if (type === "tableCell" && attrs.header === true) {
    next.header = true;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

function sanitizeMark(input: unknown): OraMark | null {
  if (!input || typeof input !== "object" || !("type" in input)) {
    return null;
  }
  const raw = input as { type: string; value?: unknown; href?: unknown; target?: unknown; rel?: unknown };
  switch (raw.type) {
    case "bold":
    case "italic":
    case "underline":
    case "strike":
    case "code":
    case "subscript":
    case "superscript":
      return { type: raw.type };
    case "color":
    case "background":
    case "fontSize":
    case "fontFamily":
      return typeof raw.value === "string" ? { type: raw.type, value: raw.value } : null;
    case "link":
      return typeof raw.href === "string"
        ? {
            type: "link",
            href: raw.href,
            ...(raw.target === "_blank" ? { target: "_blank" as const } : {}),
            ...(Array.isArray(raw.rel) ? { rel: raw.rel.filter((item): item is string => typeof item === "string") } : {}),
          }
        : null;
    default:
      return null;
  }
}

export function isValidDocument(doc: OraDocument): boolean {
  if (doc.type !== "doc" || !Array.isArray(doc.content)) {
    return false;
  }
  return doc.content.every((node) => isElement(node) || isText(node));
}
