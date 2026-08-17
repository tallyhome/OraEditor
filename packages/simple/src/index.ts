import OraEditor from "@ora-editor/core";
import type { OraEditorOptions } from "@ora-editor/core";

export function createSimpleEditor(options: OraEditorOptions): OraEditor {
  return new OraEditor({
    ...options,
    preset: "simple",
    toolbar: options.toolbar ?? true,
  });
}

export { OraEditor };
export default OraEditor;
export * from "@ora-editor/core";
