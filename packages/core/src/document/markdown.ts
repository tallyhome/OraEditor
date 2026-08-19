export type MarkdownBlockShortcut =
  | { kind: "heading"; level: number }
  | { kind: "list"; ordered: boolean }
  | { kind: "blockquote" }
  | { kind: "rule" };

export function matchBlockShortcut(prefix: string): MarkdownBlockShortcut | null {
  if (prefix === "---" || prefix === "***" || prefix === "___") {
    return { kind: "rule" };
  }
  const heading = /^(#{1,6}) $/.exec(prefix);
  if (heading?.[1]) {
    return { kind: "heading", level: heading[1].length };
  }
  if (prefix === "- " || prefix === "* ") {
    return { kind: "list", ordered: false };
  }
  if (/^\d+\. $/.test(prefix)) {
    return { kind: "list", ordered: true };
  }
  if (prefix === "> ") {
    return { kind: "blockquote" };
  }
  return null;
}

export function matchBoldShortcut(beforeCursor: string): { from: number; inner: string; raw: string } | null {
  const match = /\*\*([^*]+)\*\*$/.exec(beforeCursor);
  if (!match || match.index === undefined || !match[1]) {
    return null;
  }
  return { from: match.index, inner: match[1], raw: match[0] };
}

export function matchItalicShortcut(beforeCursor: string): { from: number; inner: string; raw: string } | null {
  if (beforeCursor.endsWith("**")) {
    return null;
  }
  const match = /(?:^|[^*])(\*([^*]+)\*)$/.exec(beforeCursor);
  if (!match || match.index === undefined || !match[1] || !match[2]) {
    return null;
  }
  const raw = match[1];
  return { from: beforeCursor.length - raw.length, inner: match[2], raw };
}
