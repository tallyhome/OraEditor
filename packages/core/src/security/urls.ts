const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:", "blob:"]);

export function isSafeUrl(url: string, options?: { allowRelative?: boolean }): boolean {
  const allowRelative = options?.allowRelative ?? true;
  const trimmed = url.trim();
  if (trimmed === "") {
    return false;
  }
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return false;
  }
  if (allowRelative && (trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("../") || trimmed.startsWith("#"))) {
    return !trimmed.includes(":");
  }
  try {
    const parsed = new URL(trimmed);
    return SAFE_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

export function sanitizeUrl(url: string): string | null {
  return isSafeUrl(url) ? url.trim() : null;
}
