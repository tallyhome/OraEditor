import type { OraMark } from "./types.js";

const MARK_ORDER = [
  "code",
  "link",
  "bold",
  "italic",
  "underline",
  "strike",
  "subscript",
  "superscript",
  "color",
  "background",
  "fontSize",
  "fontFamily",
  "mention",
] as const;

export function markKey(mark: OraMark): string {
  switch (mark.type) {
    case "color":
    case "background":
    case "fontSize":
    case "fontFamily":
    case "mention":
      return `${mark.type}:${mark.value}`;
    case "link":
      return `link:${mark.href}:${mark.target ?? ""}:${(mark.rel ?? []).join(",")}`;
    default:
      return mark.type;
  }
}

export function marksEqual(a?: OraMark[], b?: OraMark[]): boolean {
  const left = normalizeMarks(a);
  const right = normalizeMarks(b);
  if (left.length !== right.length) {
    return false;
  }
  return left.every((mark, index) => markKey(mark) === markKey(right[index] as OraMark));
}

export function normalizeMarks(marks?: OraMark[]): OraMark[] {
  if (!marks || marks.length === 0) {
    return [];
  }
  const unique = new Map<string, OraMark>();
  for (const mark of marks) {
    unique.set(mark.type, mark);
  }
  return [...unique.values()].sort(
    (a, b) => MARK_ORDER.indexOf(a.type as (typeof MARK_ORDER)[number]) - MARK_ORDER.indexOf(b.type as (typeof MARK_ORDER)[number]),
  );
}

export function hasMark(marks: OraMark[] | undefined, type: OraMark["type"]): boolean {
  return (marks ?? []).some((mark) => mark.type === type);
}

export function toggleMarkIn(marks: OraMark[] | undefined, mark: OraMark): OraMark[] {
  const current = normalizeMarks(marks);
  if (hasMark(current, mark.type)) {
    return current.filter((item) => item.type !== mark.type);
  }
  return addMarkIn(current, mark);
}

export function addMarkIn(marks: OraMark[] | undefined, mark: OraMark): OraMark[] {
  let current = (marks ?? []).filter((item) => item.type !== mark.type);
  if (mark.type === "superscript") {
    current = current.filter((item) => item.type !== "subscript");
  } else if (mark.type === "subscript") {
    current = current.filter((item) => item.type !== "superscript");
  }
  return normalizeMarks([...current, mark]);
}

export function removeMarkIn(marks: OraMark[] | undefined, type: OraMark["type"]): OraMark[] {
  return normalizeMarks((marks ?? []).filter((item) => item.type !== type));
}

export function compareMarks(a: OraMark, b: OraMark): number {
  return MARK_ORDER.indexOf(a.type as (typeof MARK_ORDER)[number]) - MARK_ORDER.indexOf(b.type as (typeof MARK_ORDER)[number]);
}
