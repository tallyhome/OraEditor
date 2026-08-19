import type { OraDocument } from "../document/types.js";
import type { OraPlugin } from "../plugins/types.js";
import type { MediaLibraryAdapter } from "../adapters/mediaLibrary.js";
import type { UploadAdapter } from "../adapters/upload.js";

export type OraPreset = "simple" | "full";

export interface OraFeatures {
  images: boolean;
  tables: boolean;
  media: boolean;
  ai: boolean;
}

export interface OraEditorOptions {
  element: string | HTMLElement;
  content?: OraDocument | string;
  editable?: boolean;
  plugins?: OraPlugin[];
  uploadImage?: UploadAdapter["uploadImage"];
  openMediaLibrary?: MediaLibraryAdapter["openMediaLibrary"];
  aiProxyUrl?: string;
  toolbar?: boolean | HTMLElement;
  preset?: OraPreset;
  features?: Partial<OraFeatures>;
  locale?: string;
  placeholder?: string;
}

export function resolveFeatures(options: OraEditorOptions): OraFeatures {
  const preset = options.preset ?? "full";
  const base: OraFeatures =
    preset === "simple"
      ? { images: true, tables: false, media: false, ai: false }
      : { images: true, tables: true, media: true, ai: true };
  return { ...base, ...options.features };
}
