import type { OraEditor } from "../api/OraEditor.js";
import type { OraFeatures } from "../api/options.js";
import { listOrdered } from "../document/schema.js";
import type { OraMark } from "../document/types.js";
import type { Selection } from "../selection/types.js";
import { isSafeUrl } from "../security/urls.js";
import { isSafeEmbedUrl, youtubeToEmbed } from "../security/embed.js";
import { openLinkDialog } from "./linkDialog.js";
import { openPromptDialog } from "./promptDialog.js";

export function mountToolbar(editor: OraEditor, host: HTMLElement, features: OraFeatures): () => void {
  const bar = document.createElement("div");
  bar.className = "ora-toolbar";
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Barre d'outils OraEditor");
  bar.innerHTML = toolbarHtml(features);
  host.insertBefore(bar, host.firstChild);

  let savedSelection: Selection | null = null;

  const onMouseDown = (event: Event) => {
    const target = event.target as HTMLElement;
    if (target.closest("input[type=color]")) {
      savedSelection = structuredClone(editor.getSelection());
      return;
    }
    if (target.closest("button, select")) {
      event.preventDefault();
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
    } else if (cmd === "video") {
      await handleMedia(editor, "video");
    } else if (cmd === "audio") {
      await handleMedia(editor, "audio");
    } else if (cmd === "embed") {
      await handleEmbed(editor);
    } else if (cmd === "color" || cmd === "background") {
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
    if (input instanceof HTMLSelectElement && input.dataset.cmd === "lineHeight") {
      editor.exec("setLineHeight", { value: input.value });
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
  });
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
  const result = await openPromptDialog(editor.hostElement, "Image", [
    { name: "src", label: "URL", type: "url", placeholder: "https://" },
    { name: "alt", label: "Texte alternatif" },
    { name: "caption", label: "Légende" },
  ]);
  if (result?.src && isSafeUrl(result.src)) {
    editor.exec("insertImage", result);
  }
}

async function handleMedia(editor: OraEditor, type: "video" | "audio"): Promise<void> {
  const result = await openPromptDialog(editor.hostElement, type === "video" ? "Vidéo" : "Audio", [
    { name: "src", label: "URL", type: "url", placeholder: "https://" },
    { name: "title", label: "Titre" },
  ]);
  if (result?.src && isSafeUrl(result.src)) {
    editor.exec(type === "video" ? "insertVideo" : "insertAudio", result);
  }
}

async function handleEmbed(editor: OraEditor): Promise<void> {
  const result = await openPromptDialog(editor.hostElement, "Média embarqué", [
    { name: "src", label: "URL YouTube / Vimeo", type: "url", placeholder: "https://www.youtube.com/watch?v=" },
  ]);
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
  });
}

function toolbarHtml(features: OraFeatures): string {
  const image = features.images
    ? `<span class="ora-toolbar-sep"></span>
    <button type="button" data-cmd="image" title="Image">🖼</button>
    <button type="button" data-cmd="library" title="Médiathèque">🗂</button>`
    : "";
  const table = features.tables
    ? `<span class="ora-toolbar-sep"></span>
    <button type="button" data-cmd="table" title="Tableau">▦</button>
    <button type="button" data-cmd="tableAddRow" title="Ajouter une ligne">＋ligne</button>
    <button type="button" data-cmd="tableAddCol" title="Ajouter une colonne">＋col</button>`
    : "";
  const media = features.media
    ? `<span class="ora-toolbar-sep"></span>
    <button type="button" data-cmd="video" title="Vidéo">▶</button>
    <button type="button" data-cmd="audio" title="Audio">♪</button>
    <button type="button" data-cmd="embed" title="YouTube / Vimeo">⧉</button>`
    : "";
  return `
    <button type="button" data-cmd="undo" title="Annuler (Ctrl+Z)">↺</button>
    <button type="button" data-cmd="redo" title="Rétablir (Ctrl+Y)">↻</button>
    <span class="ora-toolbar-sep"></span>
    <button type="button" data-cmd="paragraph" title="Paragraphe">P</button>
    <button type="button" data-heading="1" title="Titre 1">H1</button>
    <button type="button" data-heading="2" title="Titre 2">H2</button>
    <button type="button" data-heading="3" title="Titre 3">H3</button>
    <span class="ora-toolbar-sep"></span>
    <button type="button" data-mark="bold" title="Gras (Ctrl+B)"><strong>G</strong></button>
    <button type="button" data-mark="italic" title="Italique (Ctrl+I)"><em>I</em></button>
    <button type="button" data-mark="underline" title="Souligné (Ctrl+U)"><u>S</u></button>
    <button type="button" data-mark="strike" title="Barré"><s>B</s></button>
    <button type="button" data-mark="code" title="Code">\`</button>
    <label class="ora-toolbar-color" title="Couleur du texte">
      <input type="color" data-cmd="color" value="#1c1917" aria-label="Couleur du texte">
    </label>
    <label class="ora-toolbar-color" title="Surlignage">
      <input type="color" data-cmd="background" value="#fde68a" aria-label="Couleur de fond">
    </label>
    <span class="ora-toolbar-sep"></span>
    <button type="button" data-list="bullet" title="Liste à puces">•</button>
    <button type="button" data-list="ordered" title="Liste numérotée">1.</button>
    <button type="button" data-cmd="outdent" title="Diminuer le retrait">⇤</button>
    <button type="button" data-cmd="indent" title="Augmenter le retrait">⇥</button>
    <span class="ora-toolbar-sep"></span>
    <button type="button" data-align="left" title="Aligner à gauche">⬅</button>
    <button type="button" data-align="center" title="Centrer">⬌</button>
    <button type="button" data-align="right" title="Aligner à droite">➡</button>
    <button type="button" data-align="justify" title="Justifier">☰</button>
    <select data-cmd="lineHeight" title="Interligne" aria-label="Interligne">
      <option value="1">1</option>
      <option value="1.15">1.15</option>
      <option value="1.5" selected>1.5</option>
      <option value="1.65">1.65</option>
      <option value="2">2</option>
    </select>
    <span class="ora-toolbar-sep"></span>
    <button type="button" data-cmd="link" title="Lien (Ctrl+K)">🔗</button>
    <button type="button" data-cmd="unlink" title="Supprimer le lien">⛓️‍💥</button>
    <button type="button" data-cmd="blockquote" title="Citation">“</button>
    <button type="button" data-cmd="codeBlock" title="Bloc de code">{ }</button>
    ${image}
    ${table}
    ${media}
    <span class="ora-toolbar-sep"></span>
    <button type="button" data-cmd="fullscreen" title="Plein écran">⛶</button>
  `;
}
