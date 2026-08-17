const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;

export interface FileValidationOptions {
  maxBytes?: number;
  extensions?: string[];
  mimeTypes?: string[];
}

export function validateImageFile(file: File, options: FileValidationOptions = {}): string | null {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const extensions = new Set((options.extensions ?? [...ALLOWED_EXTENSIONS]).map((item) => item.toLowerCase()));
  const mimeTypes = new Set(options.mimeTypes ?? [...ALLOWED_MIME]);

  if (file.size > maxBytes) {
    return `Fichier trop volumineux (max ${Math.round(maxBytes / 1024 / 1024)} Mo).`;
  }
  const name = file.name.toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  if (!extensions.has(ext)) {
    return "Extension de fichier non autorisée.";
  }
  if (file.type && !mimeTypes.has(file.type)) {
    return "Type MIME non autorisé.";
  }
  if (ext === ".svg" || file.type === "image/svg+xml") {
    return "Les fichiers SVG ne sont pas autorisés.";
  }
  return null;
}
