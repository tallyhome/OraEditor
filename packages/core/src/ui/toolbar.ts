import type { OraEditor } from "../api/OraEditor.js";
import type { OraFeatures } from "../api/options.js";
import { listOrdered } from "../document/schema.js";
import type { OraMark } from "../document/types.js";
import type { Selection } from "../selection/types.js";
import { isSafeUrl } from "../security/urls.js";
import { isSafeEmbedUrl, youtubeToEmbed } from "../security/embed.js";
import { currentTableCell } from "../document/search.js";
import { openLinkDialog } from "./linkDialog.js";
import { openPromptDialog } from "./promptDialog.js";

const FONT_FAMILIES = [
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Times New Roman, Times, serif", label: "Times" },
  { value: "Arial, Helvetica, sans-serif", label: "Arial" },
  { value: "Trebuchet MS, sans-serif", label: "Trebuchet" },
  { value: "Courier New, monospace", label: "Courier" },
];

const FONT_SIZES = ["", "12px", "14px", "16px", "18px", "24px", "32px", "48px"];

export function mountToolbar(editor: OraEditor, host: HTMLElement, features: OraFeatures): () => void {
  const bar = document.createElement("div");
  bar.className = "ora-toolbar";
  bar.setAttribute("role", "toolbar");
  const paint = () => {
    bar.setAttribute("aria-label", editor.t("toolbar"));
    bar.innerHTML = toolbarHtml(editor, features);
  };
  paint();
  host.insertBefore(bar, host.firstChild);

  let savedSelection: Selection | null = null;

  const onMouseDown = (event: Event) => {
    const target = event.target as HTMLElement;
    if (target.closest("input[type=color], select")) {
      savedSelection = structuredClone(editor.getSelection());
      return;
    }
    if (target.closest("button, select")) {
      event.preventDefault();
    }
  };

  const restoreSelection = () => {
    if (savedSelection) {
      editor.dispatch((tr) => tr.setSelection(savedSelection as Selection), { history: false });
    }
  };

  const onClick = async (event: Event) => {
    const button = (event.target as HTMLElement).closest("button");
    if (!button || !bar.contains(button)) {
      return;
    }
    const cmd = button.dataset.cmd;
    const mark = button.dataset.mark;
    const heading = button.dataset.heading;
    const align = button.dataset.align;
    const list = button.dataset.list;
    if (mark) {
      editor.exec("toggleMark", { mark: { type: mark } });
    } else if (heading) {
      editor.exec("setBlock", { type: "heading", attrs: { level: Number(heading) } });
    } else if (align === "left" || align === "center" || align === "right" || align === "justify") {
      editor.exec("setAlign", { align });
    } else if (list === "bullet") {
      editor.exec("toggleList", { ordered: false });
    } else if (list === "ordered") {
      editor.exec("toggleList", { ordered: true });
    } else if (cmd === "paragraph") {
      editor.exec("setBlock", { type: "paragraph", attrs: {} });
    } else if (cmd === "blockquote") {
      editor.exec("toggleBlockquote");
    } else if (cmd === "codeBlock") {
      editor.exec("toggleCodeBlock");
    } else if (cmd === "indent") {
      editor.exec("indent");
    } else if (cmd === "outdent") {
      editor.exec("outdent");
    } else if (cmd === "undo") {
      editor.undo();
    } else if (cmd === "redo") {
      editor.redo();
    } else if (cmd === "link") {
      await handleLink(editor);
    } else if (cmd === "unlink") {
      editor.exec("unsetLink");
    } else if (cmd === "fullscreen") {
      editor.toggleFullscreen();
    } else if (cmd === "find") {
      editor.openFindBar();
    } else if (cmd === "image") {
      await handleImage(editor);
    } else if (cmd === "library") {
      await editor.openLibrary("image");
    } else if (cmd === "table") {
      editor.exec("insertTable", { rows: 3, cols: 3 });
    } else if (cmd === "tableAddRow") {
      editor.exec("tableAddRow");
    } else if (cmd === "tableAddCol") {
      editor.exec("tableAddColumn");
    } else if (cmd === "tableMergeRight") {
      editor.exec("tableMergeRight");
    } else if (cmd === "tableMergeDown") {
      editor.exec("tableMergeDown");
    } else if (cmd === "tableSplit") {
      editor.exec("tableSplitCell");
    } else if (cmd === "tableHeader") {
      editor.exec("tableToggleHeaderRow");
    } else if (cmd === "video") {
      await handleMedia(editor, "video");
    } else if (cmd === "audio") {
      await handleMedia(editor, "audio");
    } else if (cmd === "embed") {
      await handleEmbed(editor);
    } else if (cmd === "color" || cmd === "background" || cmd === "cellBackground") {
      return;
    }
    editor.focus();
    syncToolbar(editor, bar);
  };

  const applyColorMark = (type: "color" | "background", value: string) => {
    const mark: OraMark = { type, value };
    const selection = savedSelection;
    if (selection) {
      editor.dispatch((tr) => tr.setSelection(selection).applyMark(mark), { kind: "format" });
    } else {
      editor.exec("setMark", { mark });
    }
    editor.focus();
  };

  const onChange = (event: Event) => {
    const input = event.target as HTMLInputElement | HTMLSelectElement;
    if (input instanceof HTMLInputElement && (input.dataset.cmd === "color" || input.dataset.cmd === "background")) {
      applyColorMark(input.dataset.cmd, input.value);
    }
    if (input instanceof HTMLInputElement && input.dataset.cmd === "cellBackground") {
      restoreSelection();
      editor.exec("tableSetCellBackground", { value: input.value });
      editor.focus();
    }
    if (input instanceof HTMLSelectElement && input.dataset.cmd === "lineHeight") {
      editor.exec("setLineHeight", { value: input.value });
      editor.focus();
    }
    if (input instanceof HTMLSelectElement && input.dataset.cmd === "fontFamily") {
      restoreSelection();
      if (!input.value) {
        editor.exec("removeMark", { type: "fontFamily" });
      } else {
        editor.exec("setMark", { mark: { type: "fontFamily", value: input.value } });
      }
      editor.focus();
    }
    if (input instanceof HTMLSelectElement && input.dataset.cmd === "fontSize") {
      restoreSelection();
      if (!input.value) {
        editor.exec("removeMark", { type: "fontSize" });
      } else {
        editor.exec("setMark", { mark: { type: "fontSize", value: input.value } });
      }
      editor.focus();
    }
    syncToolbar(editor, bar);
  };

  const refresh = () => syncToolbar(editor, bar);
  bar.addEventListener("mousedown", onMouseDown);
  bar.addEventListener("click", onClick);
  bar.addEventListener("change", onChange);
  const offChange = editor.on("change", refresh);
  const offSel = editor.on("selectionChange", refresh);
  refresh();
  editor.refreshToolbar = paint;

  return () => {
    offChange();
    offSel();
    bar.removeEventListener("mousedown", onMouseDown);
    bar.removeEventListener("click", onClick);
    bar.removeEventListener("change", onChange);
    bar.remove();
  };
}

async function handleLink(editor: OraEditor): Promise<void> {
  const current = editor.getActiveMarks().find((mark) => mark.type === "link");
  const result = await openLinkDialog(editor.hostElement, {
    href: current && current.type === "link" ? current.href : editor.getSelectedText().startsWith("http") ? editor.getSelectedText() : "",
    target: current && current.type === "link" ? current.target : undefined,
  }, editor);
  if (!result) {
    return;
  }
  editor.exec("setLink", { href: result.href, target: result.target, rel: result.rel });
}

async function handleImage(editor: OraEditor): Promise<void> {
  const file = await pickFile("image/*");
  if (file) {
    await editor.insertImageFile(file);
    return;
  }
  const result = await openPromptDialog(editor.hostElement, editor.t("imageTitle"), [
    { name: "src", label: editor.t("url"), type: "url", placeholder: "https://" },
    { name: "alt", label: editor.t("alt") },
    { name: "caption", label: editor.t("caption") },
  ], editor);
  if (result?.src && isSafeUrl(result.src)) {
    editor.exec("insertImage", result);
  }
}

async function handleMedia(editor: OraEditor, type: "video" | "audio"): Promise<void> {
  const result = await openPromptDialog(editor.hostElement, editor.t(type === "video" ? "videoTitle" : "audioTitle"), [
    { name: "src", label: editor.t("url"), type: "url", placeholder: "https://" },
    { name: "title", label: editor.t("mediaTitle") },
  ], editor);
  if (result?.src && isSafeUrl(result.src)) {
    editor.exec(type === "video" ? "insertVideo" : "insertAudio", result);
  }
}

async function handleEmbed(editor: OraEditor): Promise<void> {
  const result = await openPromptDialog(editor.hostElement, editor.t("embedTitle"), [
    { name: "src", label: editor.t("embedUrl"), type: "url", placeholder: "https://www.youtube.com/watch?v=" },
  ], editor);
  if (!result?.src) {
    return;
  }
  const src = isSafeEmbedUrl(result.src) ? result.src : youtubeToEmbed(result.src);
  if (src && isSafeEmbedUrl(src)) {
    editor.exec("insertEmbed", { src });
  }
}

function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.addEventListener("change", () => resolve(input.files?.[0] ?? null));
    input.click();
  });
}

function syncToolbar(editor: OraEditor, bar: HTMLElement): void {
  const block = editor.getCurrentBlock();
  const selection = editor.getSelection();
  const path =
    selection.type === "text" ? selection.anchor.path : selection.type === "cell" ? selection.anchor : selection.path;
  const inTable = currentTableCell(editor.getJSON(), path) !== null;
  bar.querySelectorAll("button").forEach((button) => {
    button.classList.remove("is-active");
    const mark = button.dataset.mark;
    const heading = button.dataset.heading;
    const align = button.dataset.align;
    const list = button.dataset.list;
    const cmd = button.dataset.cmd;
    if (mark && editor.hasMark(mark as "bold")) {
      button.classList.add("is-active");
    }
    if (heading && block.type === "heading" && String(block.attrs?.level) === heading) {
      button.classList.add("is-active");
    }
    if (cmd === "paragraph" && block.type === "paragraph") {
      button.classList.add("is-active");
    }
    if (cmd === "blockquote" && block.type === "blockquote") {
      button.classList.add("is-active");
    }
    if (cmd === "codeBlock" && block.type === "codeBlock") {
      button.classList.add("is-active");
    }
    if (align && block.attrs?.align === align) {
      button.classList.add("is-active");
    }
    if (list === "bullet" && block.type === "listItem" && !listOrdered({ type: "listItem", attrs: block.attrs })) {
      button.classList.add("is-active");
    }
    if (list === "ordered" && block.type === "listItem" && listOrdered({ type: "listItem", attrs: block.attrs })) {
      button.classList.add("is-active");
    }
    if (cmd === "link" && editor.hasMark("link")) {
      button.classList.add("is-active");
    }
    if (cmd === "fullscreen" && editor.isFullscreen()) {
      button.classList.add("is-active");
    }
    if (cmd === "tableHeader" && inTable) {
      const cell = currentTableCell(editor.getJSON(), path);
      if (cell?.attrs?.header === true) {
        button.classList.add("is-active");
      }
    }
  });
  const family = editor.getMarkValue("fontFamily") ?? "";
  const size = editor.getMarkValue("fontSize") ?? "";
  const familySelect = bar.querySelector<HTMLSelectElement>("select[data-cmd=fontFamily]");
  const sizeSelect = bar.querySelector<HTMLSelectElement>("select[data-cmd=fontSize]");
  if (familySelect) {
    familySelect.value = FONT_FAMILIES.some((item) => item.value === family) ? family : "";
  }
  if (sizeSelect) {
    sizeSelect.value = FONT_SIZES.includes(size) ? size : "";
  }
}

function toolbarHtml(editor: OraEditor, features: OraFeatures): string {
  const t = (key: Parameters<OraEditor["t"]>[0]) => escapeAttr(editor.t(key));
  const fonts = [
    `<option value="">${escapeText(editor.t("fontDefault"))}</option>`,
    ...FONT_FAMILIES.map((item) => `<option value="${escapeAttr(item.value)}">${escapeText(item.label)}</option>`),
  ].join("");
  const sizes = FONT_SIZES.map((item) =>
    `<option value="${escapeAttr(item)}">${item ? escapeText(item.replace("px", "")) : escapeText(editor.t("fontDefault"))}</option>`,
  ).join("");
  const image = features.images
    ? `<span class="ora-toolbar-sep"></span>
    <button type="button" data-cmd="image" title="${t("image")}">🖼</button>
    <button type="button" data-cmd="library" title="${t("library")}">🗂</button>`
    : "";
  const table = features.tables
    ? `<span class="ora-toolbar-sep"></span>
    <button type="button" data-cmd="table" title="${t("table")}">▦</button>
    <button type="button" data-cmd="tableAddRow" title="${t("tableAddRow")}">＋↕</button>
    <button type="button" data-cmd="tableAddCol" title="${t("tableAddCol")}">＋↔</button>
    <button type="button" data-cmd="tableMergeRight" title="${t("tableMergeRight")}">⧉→</button>
    <button type="button" data-cmd="tableMergeDown" title="${t("tableMergeDown")}">⧉↓</button>
    <button type="button" data-cmd="tableSplit" title="${t("tableSplit")}">⊞</button>
    <button type="button" data-cmd="tableHeader" title="${t("tableHeader")}">H</button>
    <label class="ora-toolbar-color" title="${t("cellBackground")}">
      <input type="color" data-cmd="cellBackground" value="#fde68a" aria-label="${t("cellBackground")}">
    </label>`
    : "";
  const media = features.media
    ? `<span class="ora-toolbar-sep"></span>
    <button type="button" data-cmd="video" title="${t("video")}">▶</button>
    <button type="button" data-cmd="audio" title="${t("audio")}">♪</button>
    <button type="button" data-cmd="embed" title="${t("embed")}">⧉</button>`
    : "";
  return `
    <button type="button" data-cmd="undo" title="${t("undo")}">↺</button>
    <button type="button" data-cmd="redo" title="${t("redo")}">↻</button>
    <span class="ora-toolbar-sep"></span>
    <button type="button" data-cmd="paragraph" title="${t("paragraph")}">P</button>
    <button type="button" data-heading="1" title="${t("h1")}">H1</button>
    <button type="button" data-heading="2" title="${t("h2")}">H2</button>
    <button type="button" data-heading="3" title="${t("h3")}">H3</button>
    <span class="ora-toolbar-sep"></span>
    <button type="button" data-mark="bold" title="${t("bold")}"><strong>G</strong></button>
    <button type="button" data-mark="italic" title="${t("italic")}"><em>I</em></button>
    <button type="button" data-mark="underline" title="${t("underline")}"><u>S</u></button>
    <button type="button" data-mark="strike" title="${t("strike")}"><s>B</s></button>
    <button type="button" data-mark="code" title="${t("code")}">\`</button>
    <button type="button" data-mark="superscript" title="${t("superscript")}">x²</button>
    <button type="button" data-mark="subscript" title="${t("subscript")}">x₂</button>
    <select data-cmd="fontFamily" title="${t("fontFamily")}" aria-label="${t("fontFamily")}">${fonts}</select>
    <select data-cmd="fontSize" title="${t("fontSize")}" aria-label="${t("fontSize")}">${sizes}</select>
    <label class="ora-toolbar-color" title="${t("color")}">
      <input type="color" data-cmd="color" value="#1c1917" aria-label="${t("color")}">
    </label>
    <label class="ora-toolbar-color" title="${t("highlight")}">
      <input type="color" data-cmd="background" value="#fde68a" aria-label="${t("highlight")}">
    </label>
    <span class="ora-toolbar-sep"></span>
    <button type="button" data-list="bullet" title="${t("bulletList")}">•</button>
    <button type="button" data-list="ordered" title="${t("orderedList")}">1.</button>
    <button type="button" data-cmd="outdent" title="${t("outdent")}">⇤</button>
    <button type="button" data-cmd="indent" title="${t("indent")}">⇥</button>
    <span class="ora-toolbar-sep"></span>
    <button type="button" data-align="left" title="${t("alignLeft")}">⬅</button>
    <button type="button" data-align="center" title="${t("alignCenter")}">⬌</button>
    <button type="button" data-align="right" title="${t("alignRight")}">➡</button>
    <button type="button" data-align="justify" title="${t("alignJustify")}">☰</button>
    <select data-cmd="lineHeight" title="${t("lineHeight")}" aria-label="${t("lineHeight")}">
      <option value="1">1</option>
      <option value="1.15">1.15</option>
      <option value="1.5" selected>1.5</option>
      <option value="1.65">1.65</option>
      <option value="2">2</option>
    </select>
    <span class="ora-toolbar-sep"></span>
    <button type="button" data-cmd="link" title="${t("link")}">🔗</button>
    <button type="button" data-cmd="unlink" title="${t("unlink")}">⛓️‍💥</button>
    <button type="button" data-cmd="blockquote" title="${t("blockquote")}">“</button>
    <button type="button" data-cmd="codeBlock" title="${t("codeBlock")}">{ }</button>
    ${image}
    ${table}
    ${media}
    <span class="ora-toolbar-sep"></span>
    <button type="button" data-cmd="find" title="${t("find")}">⌕</button>
    <button type="button" data-cmd="fullscreen" title="${t("fullscreen")}">⛶</button>
  `;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}
