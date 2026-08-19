import type { OraEditor } from "../api/OraEditor.js";
import type { OraMark } from "../document/types.js";
import type { HistoryKind } from "../history/History.js";

export type CommandArgs = Record<string, unknown>;

export type CommandHandler = (editor: OraEditor, args?: CommandArgs) => boolean;

export class CommandRegistry {
  private handlers = new Map<string, CommandHandler>();

  register(name: string, handler: CommandHandler): void {
    this.handlers.set(name, handler);
  }

  unregister(name: string): void {
    this.handlers.delete(name);
  }

  has(name: string): boolean {
    return this.handlers.has(name);
  }

  execute(name: string, editor: OraEditor, args?: CommandArgs): boolean {
    const handler = this.handlers.get(name);
    if (!handler) {
      return false;
    }
    return handler(editor, args);
  }
}

export function registerBuiltinCommands(commands: CommandRegistry): void {
  commands.register("insertText", (editor, args) => {
    const text = String(args?.text ?? "");
    return editor.dispatch((tr) => tr.insertText(text), { kind: "typing" });
  });
  commands.register("deleteBackward", (editor) => editor.dispatch((tr) => tr.deleteBackward(), { kind: "delete" }));
  commands.register("deleteForward", (editor) => editor.dispatch((tr) => tr.deleteForward(), { kind: "delete" }));
  commands.register("deleteSelection", (editor) => editor.dispatch((tr) => tr.deleteSelection(), { kind: "delete" }));
  commands.register("splitBlock", (editor) => editor.dispatch((tr) => tr.splitBlock(), { kind: "other" }));
  commands.register("setBlock", (editor, args) => {
    const type = String(args?.type ?? "paragraph");
    const attrs = (args?.attrs as Record<string, unknown> | undefined) ?? undefined;
    return editor.dispatch((tr) => tr.setBlockType(type, attrs), { kind: "format" });
  });
  commands.register("toggleMark", (editor, args) => {
    const mark = args?.mark as OraMark | undefined;
    if (!mark?.type) {
      return false;
    }
    return editor.dispatch((tr) => tr.toggleMark(mark), { kind: "format" });
  });
  commands.register("setMark", (editor, args) => {
    const mark = args?.mark as OraMark | undefined;
    if (!mark?.type) {
      return false;
    }
    return editor.dispatch((tr) => tr.applyMark(mark), { kind: "format" });
  });
  commands.register("selectAll", (editor) => editor.dispatch((tr) => tr.selectAll(), { history: false }));
  commands.register("undo", (editor) => editor.undo());
  commands.register("redo", (editor) => editor.redo());
  commands.register("toggleList", (editor, args) => {
    const ordered = args?.ordered === true;
    return editor.dispatch((tr) => tr.toggleList(ordered), { kind: "format" });
  });
  commands.register("setAlign", (editor, args) => {
    const align = args?.align;
    if (align !== "left" && align !== "center" && align !== "right" && align !== "justify") {
      return false;
    }
    return editor.dispatch((tr) => tr.setAlign(align), { kind: "format" });
  });
  commands.register("indent", (editor) => editor.dispatch((tr) => tr.indent(), { kind: "format" }));
  commands.register("outdent", (editor) => editor.dispatch((tr) => tr.outdent(), { kind: "format" }));
  commands.register("setLineHeight", (editor, args) => {
    const value = String(args?.value ?? "");
    if (!/^\d+(?:\.\d+)?$/.test(value)) {
      return false;
    }
    return editor.dispatch((tr) => tr.setLineHeight(value), { kind: "format" });
  });
  commands.register("setLink", (editor, args) => {
    const href = String(args?.href ?? "");
    const target = args?.target === "_blank" ? "_blank" : undefined;
    const rel = Array.isArray(args?.rel) ? args.rel.filter((item): item is string => typeof item === "string") : undefined;
    return editor.dispatch((tr) => tr.setLink(href, { target, rel }), { kind: "format" });
  });
  commands.register("unsetLink", (editor) => editor.dispatch((tr) => tr.unsetLink(), { kind: "format" }));
  commands.register("toggleBlockquote", (editor) => {
    const type = editor.getCurrentBlock().type === "blockquote" ? "paragraph" : "blockquote";
    return editor.dispatch((tr) => tr.setBlockType(type), { kind: "format" });
  });
  commands.register("toggleCodeBlock", (editor) => {
    const type = editor.getCurrentBlock().type === "codeBlock" ? "paragraph" : "codeBlock";
    return editor.dispatch((tr) => tr.setBlockType(type), { kind: "format" });
  });
  commands.register("toggleFullscreen", (editor) => {
    editor.toggleFullscreen();
    return true;
  });
  commands.register("insertImage", (editor, args) => {
    const src = String(args?.src ?? "");
    if (!src) {
      return false;
    }
    return editor.dispatch((tr) => tr.insertBlock({
      type: "image",
      attrs: {
        src,
        alt: String(args?.alt ?? ""),
        title: String(args?.title ?? ""),
        caption: String(args?.caption ?? ""),
        href: String(args?.href ?? ""),
        align: args?.align,
        width: args?.width,
        uploading: args?.uploading === true,
      },
    }), { kind: "other" });
  });
  commands.register("insertVideo", (editor, args) => {
    const src = String(args?.src ?? "");
    return src ? editor.dispatch((tr) => tr.insertBlock({ type: "video", attrs: { src, title: args?.title } }), { kind: "other" }) : false;
  });
  commands.register("insertAudio", (editor, args) => {
    const src = String(args?.src ?? "");
    return src ? editor.dispatch((tr) => tr.insertBlock({ type: "audio", attrs: { src, title: args?.title } }), { kind: "other" }) : false;
  });
  commands.register("insertEmbed", (editor, args) => {
    const src = String(args?.src ?? "");
    return src ? editor.dispatch((tr) => tr.insertBlock({ type: "embed", attrs: { src } }), { kind: "other" }) : false;
  });
  commands.register("insertHorizontalRule", (editor) => editor.dispatch((tr) => tr.insertBlock({ type: "horizontalRule" }), { kind: "other" }));
  commands.register("insertFile", (editor, args) => {
    const src = String(args?.src ?? "");
    if (!src) {
      return false;
    }
    return editor.dispatch((tr) => tr.insertBlock({
      type: "file",
      attrs: {
        src,
        title: String(args?.title ?? args?.filename ?? src),
        filename: String(args?.filename ?? ""),
      },
    }), { kind: "other" });
  });
  commands.register("insertToc", (editor) => editor.dispatch((tr) => tr.ensureHeadingAnchors().insertBlock({ type: "toc" }), { kind: "other" }));
  commands.register("setAnchor", (editor, args) => {
    const id = typeof args?.id === "string" ? args.id : undefined;
    return editor.dispatch((tr) => tr.setAnchor(id), { kind: "format" });
  });
  commands.register("insertMention", (editor, args) => {
    const value = String(args?.value ?? "");
    return value ? editor.dispatch((tr) => tr.insertMention(value), { kind: "format" }) : false;
  });
  commands.register("toggleTheme", (editor) => {
    editor.toggleTheme();
    return true;
  });
  commands.register("insertTable", (editor, args) => {
    const rows = Number(args?.rows ?? 3);
    const cols = Number(args?.cols ?? 3);
    return editor.dispatch((tr) => tr.insertTable(rows, cols), { kind: "other" });
  });
  commands.register("tableAddRow", (editor) => editor.dispatch((tr) => tr.tableAddRow(), { kind: "format" }));
  commands.register("tableAddColumn", (editor) => editor.dispatch((tr) => tr.tableAddColumn(), { kind: "format" }));
  commands.register("tableDeleteRow", (editor) => editor.dispatch((tr) => tr.tableDeleteRow(), { kind: "format" }));
  commands.register("tableDeleteColumn", (editor) => editor.dispatch((tr) => tr.tableDeleteColumn(), { kind: "format" }));
  commands.register("tableMergeRight", (editor) => editor.dispatch((tr) => tr.tableMergeRight(), { kind: "format" }));
  commands.register("tableMergeDown", (editor) => editor.dispatch((tr) => tr.tableMergeDown(), { kind: "format" }));
  commands.register("tableMergeSelection", (editor) => editor.dispatch((tr) => tr.tableMergeSelection(), { kind: "format" }));
  commands.register("tableSplitCell", (editor) => editor.dispatch((tr) => tr.tableSplitCell(), { kind: "format" }));
  commands.register("tableToggleHeaderRow", (editor, args) => {
    const table = typeof args?.table === "number" ? args.table : undefined;
    const row = typeof args?.row === "number" ? args.row : undefined;
    return editor.dispatch((tr) => tr.tableToggleHeaderRow(table, row), { kind: "format" });
  });
  commands.register("tableSetCellBackground", (editor, args) => {
    const value = String(args?.value ?? "");
    return editor.dispatch((tr) => tr.tableSetCellBackground(value), { kind: "format" });
  });
  commands.register("removeMark", (editor, args) => {
    const type = String(args?.type ?? "") as OraMark["type"];
    if (!type) {
      return false;
    }
    return editor.dispatch((tr) => tr.removeMark(type), { kind: "format" });
  });
  commands.register("setNodeAttrs", (editor, args) => {
    const path = args?.path as number[] | undefined;
    const attrs = args?.attrs as Record<string, unknown> | undefined;
    if (!path || !attrs) {
      return false;
    }
    return editor.dispatch((tr) => tr.setNodeAttrs(path, attrs), { kind: "format" });
  });
}

export type { HistoryKind };
