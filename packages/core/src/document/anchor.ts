const ANCHOR_ID = /^[A-Za-z][\w:-]{0,63}$/;

export function isSafeAnchorId(value: string): boolean {
  return ANCHOR_ID.test(value.trim());
}

export function slugifyAnchor(text: string): string {
  const slug = text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug.length > 0 ? slug : "section";
}
