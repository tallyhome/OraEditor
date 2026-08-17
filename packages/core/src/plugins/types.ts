import type { OraEditor } from "../api/OraEditor.js";

export interface OraPlugin {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  compatibleCore: string;
  dependencies?: string[];
  setup: (editor: OraEditor) => void | (() => void);
}
