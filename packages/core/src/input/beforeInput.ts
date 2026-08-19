import type { OraEditor } from "../api/OraEditor.js";
import { selectionEquals } from "../selection/types.js";
import { isSafeUrl } from "../security/urls.js";
import { openLinkDialog } from "../ui/linkDialog.js";
import { closeLinkPopover, showLinkPopover } from "../ui/linkPopover.js";

export function bindInput(editor: OraEditor, contentEl: HTMLElement): () => void {
  let composing = false;

  const onBeforeInput = (event: Event) => {
    const e = event as InputEvent;
    if (composing && (e.inputType === "insertCompositionText" || e.inputType === "insertFromComposition")) {
      return;
    }
    e.preventDefault();
    editor.syncSelectionFromDom();
    handleBeforeInput(editor, e);
  };

  const onCompositionStart = () => {
    composing = true;
    editor.syncSelectionFromDom();
  };

  const onCompositionEnd = (event: CompositionEvent) => {
    composing = false;
    editor.renderFromModel();
    const text = event.data ?? "";
    if (text) {
      editor.exec("insertText", { text });
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (composing) {
      return;
    }
    const meta = event.metaKey || event.ctrlKey;
    if (meta && event.key.toLowerCase() === "z" && !event.shiftKey) {
      event.preventDefault();
      editor.undo();
      return;
    }
    if ((meta && event.shiftKey && event.key.toLowerCase() === "z") || (event.ctrlKey && event.key.toLowerCase() === "y")) {
      event.preventDefault();
      editor.redo();
      return;
    }
    if (meta && event.key.toLowerCase() === "b") {
      event.preventDefault();
      editor.exec("toggleMark", { mark: { type: "bold" } });
      return;
    }
    if (meta && event.key.toLowerCase() === "i") {
      event.preventDefault();
      editor.exec("toggleMark", { mark: { type: "italic" } });
      return;
    }
    if (meta && event.key.toLowerCase() === "u") {
      event.preventDefault();
      editor.exec("toggleMark", { mark: { type: "underline" } });
      return;
    }
    if (meta && event.key.toLowerCase() === "a") {
      event.preventDefault();
      editor.exec("selectAll");
      return;
    }
    if (meta && event.key.toLowerCase() === "k") {
      event.preventDefault();
      void promptLink(editor);
      return;
    }
    if (meta && event.key.toLowerCase() === "f") {
      event.preventDefault();
      editor.openFindBar();
      return;
    }
    if (meta && event.key.toLowerCase() === "h") {
      event.preventDefault();
      editor.openFindBar(true);
      return;
    }
    if (meta && event.shiftKey && event.key.toLowerCase() === "x") {
      event.preventDefault();
      editor.exec("toggleMark", { mark: { type: "strike" } });
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      editor.exec(event.shiftKey ? "outdent" : "indent");
      return;
    }
    if ((event.key === "Delete" || event.key === "Backspace") && editor.getSelection().type === "node") {
      event.preventDefault();
      editor.exec("deleteBackward");
    }
  };

  const onCopy = (event: ClipboardEvent) => {
    editor.syncSelectionFromDom();
    const html = editor.getSelectedHTML();
    const text = editor.getSelectedText();
    event.clipboardData?.setData("text/html", html);
    event.clipboardData?.setData("text/plain", text);
    event.preventDefault();
  };

  const onCut = (event: ClipboardEvent) => {
    onCopy(event);
    editor.exec("deleteSelection");
  };

  const onPaste = (event: ClipboardEvent) => {
    event.preventDefault();
    editor.syncSelectionFromDom();
    const files = Array.from(event.clipboardData?.files ?? []);
    const image = files.find((file) => file.type.startsWith("image/"));
    if (image && editor.features.images) {
      void editor.insertImageFile(image, "clipboard");
      return;
    }
    const attached = files.find((file) => !file.type.startsWith("image/"));
    if (attached) {
      void editor.insertFileFile(attached, "clipboard");
      return;
    }
    const html = event.clipboardData?.getData("text/html");
    const text = event.clipboardData?.getData("text/plain") ?? "";
    if (html) {
      editor.insertHTML(html);
      return;
    }
    if (text) {
      editor.exec("insertText", { text });
    }
  };

  const onDrop = (event: DragEvent) => {
    const files = Array.from(event.dataTransfer?.files ?? []);
    const image = files.find((file) => file.type.startsWith("image/"));
    if (image && editor.features.images) {
      event.preventDefault();
      void editor.insertImageFile(image, "drop");
      return;
    }
    const attached = files.find((file) => !file.type.startsWith("image/"));
    if (attached) {
      event.preventDefault();
      void editor.insertFileFile(attached, "drop");
    }
  };

  const onDragOver = (event: DragEvent) => {
    if (event.dataTransfer?.types.includes("Files")) {
      event.preventDefault();
    }
  };

  let resizing: { index: number; startX: number; startW: number } | null = null;
  const onMouseDown = (event: MouseEvent) => {
    const handle = (event.target as Element | null)?.closest?.("[data-ora-resize]");
    if (!handle || !contentEl.contains(handle)) {
      return;
    }
    event.preventDefault();
    const index = Number((handle as HTMLElement).dataset.oraResize);
    const img = handle.parentElement?.querySelector("img");
    resizing = { index, startX: event.clientX, startW: img?.getBoundingClientRect().width ?? 240 };
  };
  const onMouseMove = (event: MouseEvent) => {
    if (!resizing) {
      return;
    }
    const width = Math.max(48, Math.round(resizing.startW + event.clientX - resizing.startX));
    editor.exec("setNodeAttrs", { path: [resizing.index], attrs: { width } });
  };
  const onMouseUp = () => {
    resizing = null;
  };

  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const handle = target.closest<HTMLElement>("[data-ora-toggle-header]");
    if (handle && contentEl.contains(handle)) {
      event.preventDefault();
      const parts = handle.dataset.oraToggleHeader?.split(".").map(Number);
      if (parts && parts.length >= 2 && parts.every((part) => !Number.isNaN(part))) {
        editor.exec("tableToggleHeaderRow", { table: parts[0], row: parts[1] });
      }
      return;
    }
    const atomic = target.closest<HTMLElement>("[data-ora-node]");
    if (atomic && contentEl.contains(atomic) && atomic.dataset.oraNode !== "table") {
      event.preventDefault();
      const index = Number(atomic.dataset.oraPath);
      if (Number.isFinite(index)) {
        editor.setNodeSelection([index]);
      }
      return;
    }
    const cell = target.closest<HTMLElement>("td[data-ora-path], th[data-ora-path]");
    if (cell && contentEl.contains(cell)) {
      const path = cell.dataset.oraPath?.split(".").map(Number);
      if (path && path.length >= 3 && path.every((part) => !Number.isNaN(part))) {
        if (event.shiftKey) {
          event.preventDefault();
          const current = editor.getSelection();
          const start =
            current.type === "cell"
              ? current.anchor
              : current.type === "text" && current.anchor.path.length >= 3
                ? current.anchor.path.slice(0, 3)
                : path;
          editor.setCellSelection(start, path);
          return;
        }
        editor.setSelectionFromDom({ type: "text", anchor: { path: [...path, 0], offset: 0 }, focus: { path: [...path, 0], offset: 0 } });
      }
    }
    const anchor = target.closest("a[href]");
    if (!anchor || !contentEl.contains(anchor)) {
      return;
    }
    event.preventDefault();
    const point = pointFromLink(anchor);
    if (point) {
      editor.setSelectionFromDom({ type: "text", anchor: point, focus: point });
    } else {
      editor.syncSelectionFromDom();
    }
    const href = anchor.getAttribute("href") ?? "";
    if (!isSafeUrl(href)) {
      return;
    }
    const readOnly = contentEl.contentEditable === "false";
    if (readOnly || event.metaKey || event.ctrlKey) {
      openExternalUrl(href);
      return;
    }
    editor.selectActiveLink();
    showLinkPopover(editor.hostElement, anchor as HTMLElement, {
      href,
      labels: { open: editor.t("open"), edit: editor.t("edit"), remove: editor.t("remove") },
      onOpen: () => openExternalUrl(href),
      onEdit: () => {
        void promptLink(editor);
      },
      onRemove: () => {
        editor.exec("unsetLink");
      },
    });
  };

  const onFocus = () => editor.emitFocus();
  const onBlur = () => editor.emitBlur();

  const onSelChange = () => {
    if (editor.isBusy()) {
      return;
    }
    const next = editor.readDomSelection();
    if (next && !selectionEquals(next, editor.getSelection())) {
      editor.setSelectionFromDom(next);
    }
  };

  contentEl.addEventListener("beforeinput", onBeforeInput);
  contentEl.addEventListener("compositionstart", onCompositionStart);
  contentEl.addEventListener("compositionend", onCompositionEnd);
  contentEl.addEventListener("keydown", onKeyDown);
  contentEl.addEventListener("copy", onCopy);
  contentEl.addEventListener("cut", onCut);
  contentEl.addEventListener("paste", onPaste);
  contentEl.addEventListener("click", onClick);
  contentEl.addEventListener("drop", onDrop);
  contentEl.addEventListener("dragover", onDragOver);
  contentEl.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
  contentEl.addEventListener("focus", onFocus);
  contentEl.addEventListener("blur", onBlur);
  document.addEventListener("selectionchange", onSelChange);

  return () => {
    closeLinkPopover(editor.hostElement);
    contentEl.removeEventListener("beforeinput", onBeforeInput);
    contentEl.removeEventListener("compositionstart", onCompositionStart);
    contentEl.removeEventListener("compositionend", onCompositionEnd);
    contentEl.removeEventListener("keydown", onKeyDown);
    contentEl.removeEventListener("copy", onCopy);
    contentEl.removeEventListener("cut", onCut);
    contentEl.removeEventListener("paste", onPaste);
    contentEl.removeEventListener("click", onClick);
    contentEl.removeEventListener("drop", onDrop);
    contentEl.removeEventListener("dragover", onDragOver);
    contentEl.removeEventListener("mousedown", onMouseDown);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    contentEl.removeEventListener("focus", onFocus);
    contentEl.removeEventListener("blur", onBlur);
    document.removeEventListener("selectionchange", onSelChange);
  };
}

function handleBeforeInput(editor: OraEditor, e: InputEvent): void {
  switch (e.inputType) {
    case "insertText":
      editor.exec("insertText", { text: e.data ?? "" });
      void editor.refreshMentions();
      break;
    case "insertParagraph":
    case "insertLineBreak":
      editor.exec("splitBlock");
      break;
    case "deleteContentBackward":
      editor.exec("deleteBackward");
      break;
    case "deleteContentForward":
      editor.exec("deleteForward");
      break;
    case "deleteByCut":
    case "deleteContent":
      editor.exec("deleteSelection");
      break;
    case "historyUndo":
      editor.undo();
      break;
    case "historyRedo":
      editor.redo();
      break;
    case "formatBold":
      editor.exec("toggleMark", { mark: { type: "bold" } });
      break;
    case "formatItalic":
      editor.exec("toggleMark", { mark: { type: "italic" } });
      break;
    case "formatUnderline":
      editor.exec("toggleMark", { mark: { type: "underline" } });
      break;
    case "formatStrikeThrough":
      editor.exec("toggleMark", { mark: { type: "strike" } });
      break;
    case "insertFromPaste":
    case "insertFromDrop": {
      const text = e.dataTransfer?.getData("text/plain") ?? e.data ?? "";
      if (text) {
        editor.exec("insertText", { text });
      }
      break;
    }
    default:
      if (e.data) {
        editor.exec("insertText", { text: e.data });
      }
  }
}

async function promptLink(editor: OraEditor): Promise<void> {
  const current = editor.getActiveMarks().find((mark) => mark.type === "link");
  const result = await openLinkDialog(editor.hostElement, {
    href: current && current.type === "link" ? current.href : "",
    target: current && current.type === "link" ? current.target : undefined,
  }, editor);
  if (result) {
    editor.exec("setLink", { href: result.href, target: result.target, rel: result.rel });
  }
}

function openExternalUrl(href: string): void {
  if (!isSafeUrl(href) || typeof window === "undefined") {
    return;
  }
  window.open(href, "_blank", "noopener,noreferrer");
}

function pointFromLink(anchor: Element): { path: number[]; offset: number } | null {
  const span = anchor.closest("[data-ora-path]");
  const raw = span instanceof HTMLElement ? span.dataset.oraPath : undefined;
  if (!raw) {
    return null;
  }
  const path = raw.split(".").map((part) => Number(part));
  if (path.length < 2 || path.some((part) => Number.isNaN(part))) {
    return null;
  }
  return { path, offset: 0 };
}
