import { OraEditor } from "./api/OraEditor.js";

export { OraEditor };
export default OraEditor;

export { CORE_VERSION, DOCUMENT_MODEL_VERSION } from "./version.js";
export type { OraEditorOptions, OraFeatures, OraPreset } from "./api/options.js";
export { resolveFeatures } from "./api/options.js";
export type {
  OraDocument,
  OraElement,
  OraMark,
  OraNode,
  OraText,
  Path,
  Point,
} from "./document/types.js";
export {
  createEmptyDocument,
  fromHTML,
  fromJSON,
  toHTML,
  toJSON,
} from "./document/index.js";
export { Schema } from "./document/schema.js";
export type { Selection, TextSelection } from "./selection/types.js";
export type { OraPlugin } from "./plugins/types.js";
export type { OraEventType, EventHandler } from "./events/EventBus.js";
export type { UploadAdapter, UploadedAsset, MediaLibraryAdapter, MediaItem } from "./adapters/index.js";
export { blobUploadAdapter } from "./adapters/index.js";
export type { AIProvider, AIRequest, AIResponse, AICapability } from "./ai/types.js";
export {
  mockAIProvider,
  oraAIProvider,
  createOllamaEngine,
  createLocalProvider,
  createOpenAIProvider,
  createCustomProvider,
} from "./ai/index.js";
export { isSafeUrl, validateImageFile } from "./security/index.js";
export { CommandRegistry } from "./commands/index.js";
export { cleanPastedHtml, cleanWordHtml } from "./clipboard/index.js";
export { resolveLocale, supportedLocales } from "./i18n/index.js";
export type { OraLocale, OraMessageKey } from "./i18n/index.js";

declare global {
  interface Window {
    OraEditor: typeof OraEditor;
  }
}

if (typeof window !== "undefined") {
  window.OraEditor = OraEditor;
}
