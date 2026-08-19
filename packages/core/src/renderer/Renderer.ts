import type { OraDocument, OraElement, OraMark, OraNode, OraText, Point } from "../document/types.js";
import { isElement, isText } from "../document/types.js";
import { blockAlign, blockIndent, blockLineHeight, headingLevel, listLevel, listOrdered } from "../document/schema.js";
import { isAtomicBlock, isListItem, isTable } from "../document/blocks.js";
import { isEmptyDocument } from "../document/search.js";
import { cellBackground, cellColSpan, cellRowSpan } from "../document/table.js";
import { isSafeEmbedUrl } from "../security/embed.js";
import { normalizeMarks } from "../document/marks.js";
import type { Selection, TextSelection } from "../selection/types.js";
import { isTextSelection } from "../selection/types.js";
import { isSafeCssColor, isSafeFontFamily, isSafeFontSize } from "../security/css.js";
import { isSafeUrl } from "../security/urls.js";

export class Renderer {
  readonly contentEl: HTMLElement;
  private blockHashes: string[] = [];
  private placeholder = "";
  private headerLabel = "";

  constructor(host: HTMLElement) {
    this.contentEl = document.createElement("div");
    this.contentEl.className = "ora-content";
    this.contentEl.contentEditable = "true";
    this.contentEl.setAttribute("role", "textbox");
    this.contentEl.setAttribute("aria-multiline", "true");
    this.contentEl.spellcheck = true;
    host.appendChild(this.contentEl);
  }

  setPlaceholder(text: string): void {
    this.placeholder = text;
    this.contentEl.dataset.placeholder = text;
  }

  setHeaderLabel(text: string): void {
    this.headerLabel = text;
  }

  render(doc: OraDocument, selection: Selection, syncSelection = true): void {
    const hashes = doc.content.map((block) => JSON.stringify(block));
    for (let i = 0; i < hashes.length; i += 1) {
      if (this.blockHashes[i] !== hashes[i]) {
        const block = doc.content[i];
        if (!block) {
          continue;
        }
        const el = renderBlock(block, i, doc);
        const existing = this.contentEl.children[i];
        if (existing) {
          this.contentEl.replaceChild(el, existing);
        } else {
          this.contentEl.appendChild(el);
        }
      } else {
        const existing = this.contentEl.children[i] as HTMLElement | undefined;
        if (existing) {
          existing.dataset.oraPath = String(i);
        }
      }
    }
    while (this.contentEl.children.length > hashes.length) {
      this.contentEl.lastElementChild?.remove();
    }
    this.blockHashes = hashes;
    this.contentEl.classList.toggle("ora-is-empty", isEmptyDocument(doc));
    this.contentEl.dataset.placeholder = this.placeholder;
    this.contentEl.querySelectorAll<HTMLElement>("[data-ora-toggle-header]").forEach((handle) => {
      handle.title = this.headerLabel;
      handle.setAttribute("aria-label", this.headerLabel);
    });
    if (syncSelection) {
      this.applySelection(selection);
    }
  }

  applySelection(selection: Selection): void {
    if (!isTextSelection(selection) || typeof document === "undefined") {
      return;
    }
    const view = document.getSelection();
    if (!view) {
      return;
    }
    const anchor = pointToDom(this.contentEl, selection.anchor);
    const focus = pointToDom(this.contentEl, selection.focus);
    if (!anchor || !focus) {
      return;
    }
    view.setBaseAndExtent(anchor.node, anchor.offset, focus.node, focus.offset);
  }

  selectionFromDom(): TextSelection | null {
    const view = document.getSelection();
    if (!view || view.rangeCount === 0 || !view.anchorNode || !view.focusNode) {
      return null;
    }
    if (!this.contentEl.contains(view.anchorNode) || !this.contentEl.contains(view.focusNode)) {
      return null;
    }
    const anchor = domToPoint(this.contentEl, view.anchorNode, view.anchorOffset);
    const focus = domToPoint(this.contentEl, view.focusNode, view.focusOffset);
    if (!anchor || !focus) {
      return null;
    }
    return { type: "text", anchor, focus };
  }

  destroy(): void {
    this.contentEl.remove();
    this.blockHashes = [];
  }
}

function renderBlock(node: OraNode, index: number, doc: OraDocument): HTMLElement {
  if (isElement(node) && isAtomicBlock(node)) {
    return renderAtomic(node, index);
  }
  if (isElement(node) && isTable(node)) {
    return renderTable(node, index);
  }
  const el = document.createElement(blockTag(node));
  el.dataset.oraPath = String(index);
  if (isElement(node)) {
    applyBlockChrome(el, node, index, doc);
  }
  const content = !isText(node) ? (node.content ?? []) : [];
  const first = content[0];
  const onlyEmpty = content.length === 1 && first !== undefined && isText(first) && first.text === "";
  if (content.length === 0 || onlyEmpty) {
    const span = document.createElement("span");
    span.dataset.oraPath = `${index}.0`;
    span.appendChild(document.createElement("br"));
    el.appendChild(span);
    return el;
  }
  content.forEach((child, childIndex) => {
    if (isText(child)) {
      el.appendChild(renderText(child, `${index}.${childIndex}`));
    }
  });
  return el;
}

function renderAtomic(node: OraElement, index: number): HTMLElement {
  const wrap = document.createElement("figure");
  wrap.dataset.oraPath = String(index);
  wrap.dataset.oraNode = node.type;
  wrap.contentEditable = "false";
  wrap.className = `ora-atomic ora-${node.type}`;
  const align = node.attrs?.align;
  if (align === "left" || align === "center" || align === "right") {
    wrap.style.textAlign = align;
  }
  if (node.attrs?.shadow === true) {
    wrap.classList.add("ora-atomic--shadow");
  }
  if (node.attrs?.border === true) {
    wrap.classList.add("ora-atomic--border");
  }
  const src = String(node.attrs?.src ?? "");
  if (node.type === "image" && isSafeUrl(src)) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = String(node.attrs?.alt ?? "");
    if (typeof node.attrs?.title === "string") {
      img.title = node.attrs.title;
    }
    if (typeof node.attrs?.width === "number") {
      img.style.width = `${node.attrs.width}px`;
    }
    wrap.appendChild(img);
    const handle = document.createElement("span");
    handle.className = "ora-resize";
    handle.dataset.oraResize = String(index);
    wrap.appendChild(handle);
  } else if (node.type === "video" && isSafeUrl(src)) {
    const video = document.createElement("video");
    video.src = src;
    video.controls = true;
    wrap.appendChild(video);
  } else if (node.type === "audio" && isSafeUrl(src)) {
    const audio = document.createElement("audio");
    audio.src = src;
    audio.controls = true;
    wrap.appendChild(audio);
  } else if (node.type === "embed" && isSafeEmbedUrl(src)) {
    const iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.setAttribute("allowfullscreen", "true");
    iframe.setAttribute("loading", "lazy");
    wrap.appendChild(iframe);
  }
  if (typeof node.attrs?.caption === "string" && node.attrs.caption) {
    const cap = document.createElement("figcaption");
    cap.textContent = node.attrs.caption;
    wrap.appendChild(cap);
  }
  if (node.attrs?.uploading === true) {
    wrap.classList.add("ora-atomic--uploading");
  }
  return wrap;
}

function renderTable(node: OraElement, index: number): HTMLElement {
  const table = document.createElement("table");
  table.className = "ora-table";
  table.dataset.oraPath = String(index);
  table.dataset.oraNode = "table";
  (node.content ?? []).forEach((row, r) => {
    if (!isElement(row)) {
      return;
    }
    const tr = document.createElement("tr");
    (row.content ?? []).forEach((cell, c) => {
      if (!isElement(cell)) {
        return;
      }
      const td = document.createElement(cell.attrs?.header === true ? "th" : "td");
      td.dataset.oraPath = `${index}.${r}.${c}`;
      const colspan = cellColSpan(cell);
      const rowspan = cellRowSpan(cell);
      if (colspan > 1) {
        td.colSpan = colspan;
      }
      if (rowspan > 1) {
        td.rowSpan = rowspan;
      }
      const background = cellBackground(cell);
      if (background && isSafeCssColor(background)) {
        td.style.backgroundColor = background;
      }
      if (c === 0) {
        const handle = document.createElement("button");
        handle.type = "button";
        handle.className = "ora-row-handle";
        handle.tabIndex = -1;
        handle.contentEditable = "false";
        handle.dataset.oraToggleHeader = `${index}.${r}`;
        td.appendChild(handle);
      }
      const content = cell.content ?? [];
      if (content.length === 0) {
        const span = document.createElement("span");
        span.dataset.oraPath = `${index}.${r}.${c}.0`;
        span.appendChild(document.createElement("br"));
        td.appendChild(span);
      } else {
        content.forEach((child, t) => {
          if (isText(child)) {
            td.appendChild(renderText(child, `${index}.${r}.${c}.${t}`));
          }
        });
      }
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
  return table;
}

function blockTag(node: OraNode): string {
  if (isText(node)) {
    return "p";
  }
  if (node.type === "heading") {
    return `h${headingLevel(node)}`;
  }
  if (node.type === "blockquote") {
    return "blockquote";
  }
  if (node.type === "codeBlock") {
    return "pre";
  }
  if (node.type === "listItem") {
    return "div";
  }
  return "p";
}

function applyBlockChrome(el: HTMLElement, node: OraElement, index: number, doc: OraDocument): void {
  const align = blockAlign(node);
  if (align) {
    el.style.textAlign = align;
  }
  const indent = blockIndent(node);
  if (indent > 0 && !isListItem(node)) {
    el.style.marginLeft = `${indent * 1.5}em`;
  }
  const lineHeight = blockLineHeight(node);
  if (lineHeight) {
    el.style.lineHeight = lineHeight;
  }
  if (node.type === "blockquote") {
    el.classList.add("ora-blockquote");
  }
  if (node.type === "codeBlock") {
    el.classList.add("ora-code-block");
  }
  if (isListItem(node)) {
    const level = listLevel(node);
    const ordered = listOrdered(node);
    el.classList.add("ora-list-item");
    el.dataset.oraOrdered = ordered ? "true" : "false";
    el.dataset.oraLevel = String(level);
    el.style.setProperty("--ora-list-level", String(level));
    if (ordered) {
      el.dataset.oraNum = String(listItemNumber(doc, index));
    }
  }
}

function listItemNumber(doc: OraDocument, index: number): number {
  const item = doc.content[index];
  if (!item || !isListItem(item) || !listOrdered(item)) {
    return 1;
  }
  const level = listLevel(item);
  let n = 1;
  for (let i = index - 1; i >= 0; i -= 1) {
    const prev = doc.content[i];
    if (!prev || !isListItem(prev)) {
      break;
    }
    const prevLevel = listLevel(prev);
    if (prevLevel < level) {
      break;
    }
    if (prevLevel === level) {
      if (!listOrdered(prev)) {
        break;
      }
      n += 1;
    }
  }
  return n;
}

function renderText(node: OraText, path: string): HTMLElement {
  const span = document.createElement("span");
  span.dataset.oraPath = path;
  if (node.text === "") {
    span.appendChild(document.createElement("br"));
    return span;
  }
  let current: Node = document.createTextNode(node.text);
  for (const mark of normalizeMarks(node.marks).slice().reverse()) {
    current = wrapMark(mark, current);
  }
  span.appendChild(current);
  return span;
}

function wrapMark(mark: OraMark, child: Node): HTMLElement {
  let el: HTMLElement;
  switch (mark.type) {
    case "bold":
      el = document.createElement("strong");
      break;
    case "italic":
      el = document.createElement("em");
      break;
    case "underline":
      el = document.createElement("u");
      break;
    case "strike":
      el = document.createElement("s");
      break;
    case "code":
      el = document.createElement("code");
      break;
    case "subscript":
      el = document.createElement("sub");
      break;
    case "superscript":
      el = document.createElement("sup");
      break;
    case "link": {
      el = document.createElement("a");
      if (isSafeUrl(mark.href)) {
        el.setAttribute("href", mark.href);
        el.setAttribute("title", `${mark.href} — Ctrl+clic pour ouvrir`);
      }
      if (mark.target === "_blank") {
        el.setAttribute("target", "_blank");
        const rel = mark.rel?.length ? mark.rel : ["noopener"];
        el.setAttribute("rel", rel.join(" "));
      } else if (mark.rel?.length) {
        el.setAttribute("rel", mark.rel.join(" "));
      }
      break;
    }
    default: {
      el = document.createElement("span");
      if (mark.type === "color" && isSafeCssColor(mark.value)) {
        el.style.color = mark.value;
      } else if (mark.type === "background" && isSafeCssColor(mark.value)) {
        el.style.backgroundColor = mark.value;
      } else if (mark.type === "fontSize" && isSafeFontSize(mark.value)) {
        el.style.fontSize = mark.value;
      } else if (mark.type === "fontFamily" && isSafeFontFamily(mark.value)) {
        el.style.fontFamily = mark.value;
      }
    }
  }
  el.appendChild(child);
  return el;
}

function pointToDom(root: HTMLElement, point: Point): { node: Node; offset: number } | null {
  const path = point.path.join(".");
  const span = root.querySelector(`[data-ora-path="${path}"]`);
  if (!span) {
    const block = root.children[point.path[0] ?? 0] as HTMLElement | undefined;
    if (!block) {
      return null;
    }
    return { node: block, offset: 0 };
  }
  const text = firstText(span);
  if (!text) {
    return { node: span, offset: 0 };
  }
  return { node: text, offset: Math.min(point.offset, text.data.length) };
}

function domToPoint(root: HTMLElement, node: Node, offset: number): Point | null {
  let current: Node | null = node;
  if (current === root) {
    const index = Math.min(offset, root.children.length - 1);
    return { path: [Math.max(0, index), 0], offset: 0 };
  }
  while (current && current !== root) {
    if (current instanceof HTMLElement && current.dataset.oraPath) {
      const parts = current.dataset.oraPath.split(".").map((item) => Number(item));
      if (parts.length === 1) {
        const blockIndex = parts[0] ?? 0;
        if (offset === 0) {
          return { path: [blockIndex, 0], offset: 0 };
        }
        const lastSpan = current.querySelector("[data-ora-path]:last-of-type");
        const lastPath = lastSpan?.getAttribute("data-ora-path")?.split(".").map(Number);
        const text = lastSpan ? firstText(lastSpan) : null;
        if (lastPath && lastPath.length >= 2) {
          return { path: lastPath, offset: text?.data.length ?? 0 };
        }
        return { path: [blockIndex, 0], offset: 0 };
      }
      if (node.nodeType === Node.TEXT_NODE) {
        return { path: parts, offset };
      }
      const text = firstText(current);
      return { path: parts, offset: text ? Math.min(offset, text.data.length) : 0 };
    }
    current = current.parentNode;
  }
  return { path: [0, 0], offset: 0 };
}

function firstText(node: Node): Text | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return node as Text;
  }
  for (const child of Array.from(node.childNodes)) {
    const found = firstText(child);
    if (found) {
      return found;
    }
  }
  return null;
}
