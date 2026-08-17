import OraEditor from "@ora-editor/core";
import type { OraEditorOptions } from "@ora-editor/core";

export function createFullEditor(options: OraEditorOptions): OraEditor {
  return new OraEditor({
    ...options,
    preset: "full",
    toolbar: options.toolbar ?? true,
  });
}

export { OraEditor };
export default OraEditor;
export * from "@ora-editor/core";
