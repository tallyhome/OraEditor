const COLOR_HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const COLOR_RGB = /^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*[\d.]+)?\s*\)$/i;
const FONT_SIZE = /^\d+(?:\.\d+)?(?:px|em|rem|%)$/;
const FONT_FAMILY = /^[a-zA-Z0-9\s,"'-]+$/;

export function isSafeCssColor(value: string): boolean {
  const trimmed = value.trim();
  return COLOR_HEX.test(trimmed) || COLOR_RGB.test(trimmed);
}

export function isSafeFontSize(value: string): boolean {
  return FONT_SIZE.test(value.trim());
}

export function isSafeFontFamily(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length < 80 && FONT_FAMILY.test(trimmed) && !trimmed.includes("expression") && !trimmed.includes("url(");
}
