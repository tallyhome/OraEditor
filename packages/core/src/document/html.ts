import { isSafeUrl } from "../security/urls.js";
import { isSafeCssColor, isSafeFontFamily, isSafeFontSize } from "../security/css.js";
import { isSafeEmbedUrl, youtubeToEmbed } from "../security/embed.js";
import type { OraDocument, OraElement, OraMark, OraNode } from "./types.js";
import { createEmptyDocument, isElement, isText } from "./types.js";
import { blockAlign, blockIndent, blockLineHeight, headingLevel, listLevel, listOrdered } from "./schema.js";
import { isListItem } from "./blocks.js";
import { normalizeMarks } from "./marks.js";
import { cellBackground, cellColSpan, cellRowSpan } from "./table.js";

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "OBJECT", "EMBED", "LINK", "META"]);

export function toHTML(doc: OraDocument): string {
  return blocksToHTML(doc.content);
}

function blocksToHTML(blocks: OraNode[]): string {
  let html = "";
  let index = 0;
  while (index < blocks.length) {
    const block = blocks[index];
    if (!block) {
      index += 1;
      continue;
    }
    if (isListItem(block)) {
      const run = collectListRun(blocks, index);
      html += listRunToHTML(run);
      index += run.length;
      continue;
    }
    html += nodeToHTML(block);
    index += 1;
  }
  return html;
}

function collectListRun(blocks: OraNode[], start: number): OraElement[] {
  const run: OraElement[] = [];
  for (let i = start; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (!block || !isListItem(block)) {
      break;
    }
    run.push(block);
  }
  return run;
}

function listRunToHTML(items: OraElement[]): string {
  let html = "";
  let index = 0;
  while (index < items.length) {
    const current = items[index];
    if (!current) {
      break;
    }
    const rendered = renderList(items, index, listLevel(current));
    html += rendered.fragment;
    index = rendered.next;
  }
  return html;
}

function renderList(items: OraElement[], start: number, level: number): { fragment: string; next: number } {
  const first = items[start];
  if (!first) {
    return { fragment: "", next: start };
  }
  const ordered = listOrdered(first);
  const tag = ordered ? "ol" : "ul";
  let html = `<${tag}>`;
  let i = start;
  while (i < items.length) {
    const item = items[i];
    if (!item) {
      i += 1;
      continue;
    }
    const itemLevel = listLevel(item);
    if (itemLevel < level) {
      break;
    }
    if (itemLevel > level) {
      const nested = renderList(items, i, itemLevel);
      html += nested.fragment;
      i = nested.next;
      continue;
    }
    if (listOrdered(item) !== ordered) {
      break;
    }
    let inner = childrenToHTML(item);
    i += 1;
    const next = items[i];
    if (next && listLevel(next) > level) {
      const nested = renderList(items, i, level + 1);
      inner += nested.fragment;
      i = nested.next;
    }
    html += `<li${blockStyleAttr(item)}>${inner}</li>`;
  }
  html += `</${tag}>`;
  return { fragment: html, next: i };
}

function nodeToHTML(node: OraNode): string {
  if (isText(node)) {
    return wrapMarks(escapeText(node.text), node.marks);
  }
  const style = blockStyleAttr(node);
  if (node.type === "heading") {
    const level = headingLevel(node);
    return `<h${level}${style}>${childrenToHTML(node)}</h${level}>`;
  }
  if (node.type === "blockquote") {
    return `<blockquote${style}>${childrenToHTML(node)}</blockquote>`;
  }
  if (node.type === "codeBlock") {
    return `<pre${style}><code>${childrenToHTML(node)}</code></pre>`;
  }
  if (node.type === "listItem") {
    return `<li${style}>${childrenToHTML(node)}</li>`;
  }
  if (node.type === "image") {
    return imageToHTML(node);
  }
  if (node.type === "video") {
    const src = String(node.attrs?.src ?? "");
    return isSafeUrl(src) ? `<video src="${escapeAttr(src)}" controls></video>` : "";
  }
  if (node.type === "audio") {
    const src = String(node.attrs?.src ?? "");
    return isSafeUrl(src) ? `<audio src="${escapeAttr(src)}" controls></audio>` : "";
  }
  if (node.type === "embed") {
    const src = String(node.attrs?.src ?? "");
    return isSafeEmbedUrl(src) ? `<iframe src="${escapeAttr(src)}" allowfullscreen loading="lazy"></iframe>` : "";
  }
  if (node.type === "table") {
    return tableToHTML(node);
  }
  return `<p${style}>${childrenToHTML(node)}</p>`;
}

function imageToHTML(node: OraElement): string {
  const src = String(node.attrs?.src ?? "");
  if (!isSafeUrl(src)) {
    return "";
  }
  const alt = escapeAttr(String(node.attrs?.alt ?? ""));
  const title = node.attrs?.title ? ` title="${escapeAttr(String(node.attrs.title))}"` : "";
  const width = typeof node.attrs?.width === "number" ? ` width="${node.attrs.width}"` : "";
  let img = `<img src="${escapeAttr(src)}" alt="${alt}"${title}${width}>`;
  if (typeof node.attrs?.href === "string" && isSafeUrl(node.attrs.href)) {
    img = `<a href="${escapeAttr(node.attrs.href)}">${img}</a>`;
  }
  const caption = typeof node.attrs?.caption === "string" && node.attrs.caption ? `<figcaption>${escapeText(node.attrs.caption)}</figcaption>` : "";
  const align = blockAlign(node);
  const style = align ? ` style="text-align: ${align}"` : "";
  return `<figure${style}>${img}${caption}</figure>`;
}

function tableToHTML(node: OraElement): string {
  const rows = (node.content ?? []).filter(isElement);
  const body = rows
    .map((row) => {
      const cells = (row.content ?? []).filter(isElement);
      const inner = cells
        .map((cell) => {
          const tag = cell.attrs?.header === true ? "th" : "td";
          const attrs: string[] = [];
          const colspan = cellColSpan(cell);
          const rowspan = cellRowSpan(cell);
          if (colspan > 1) {
            attrs.push(`colspan="${colspan}"`);
          }
          if (rowspan > 1) {
            attrs.push(`rowspan="${rowspan}"`);
          }
          const background = cellBackground(cell);
          if (background && isSafeCssColor(background)) {
            attrs.push(`style="background-color: ${background}"`);
          }
          const extra = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
          return `<${tag}${extra}>${childrenToHTML(cell)}</${tag}>`;
        })
        .join("");
      return `<tr>${inner}</tr>`;
    })
    .join("");
  return `<table>${body}</table>`;
}

function blockStyleAttr(node: OraElement): string {
  const styles: string[] = [];
  const align = blockAlign(node);
  if (align) {
    styles.push(`text-align: ${align}`);
  }
  const indent = blockIndent(node);
  if (indent > 0) {
    styles.push(`margin-left: ${indent * 1.5}em`);
  }
  const lineHeight = blockLineHeight(node);
  if (lineHeight) {
    styles.push(`line-height: ${lineHeight}`);
  }
  return styles.length > 0 ? ` style="${styles.join("; ")}"` : "";
}

function childrenToHTML(node: OraElement): string {
  if (!node.content || node.content.length === 0) {
    return "";
  }
  return node.content.map((child) => nodeToHTML(child)).join("");
}

function wrapMarks(html: string, marks?: OraMark[]): string {
  let result = html;
  for (const mark of normalizeMarks(marks).slice().reverse()) {
    result = wrapMark(result, mark);
  }
  return result;
}

function wrapMark(inner: string, mark: OraMark): string {
  switch (mark.type) {
    case "bold":
      return `<strong>${inner}</strong>`;
    case "italic":
      return `<em>${inner}</em>`;
    case "underline":
      return `<u>${inner}</u>`;
    case "strike":
      return `<s>${inner}</s>`;
    case "code":
      return `<code>${inner}</code>`;
    case "subscript":
      return `<sub>${inner}</sub>`;
    case "superscript":
      return `<sup>${inner}</sup>`;
    case "color":
      return isSafeCssColor(mark.value) ? `<span style="color: ${mark.value}">${inner}</span>` : inner;
    case "background":
      return isSafeCssColor(mark.value) ? `<span style="background-color: ${mark.value}">${inner}</span>` : inner;
    case "fontSize":
      return isSafeFontSize(mark.value) ? `<span style="font-size: ${mark.value}">${inner}</span>` : inner;
    case "fontFamily":
      return isSafeFontFamily(mark.value) ? `<span style="font-family: ${mark.value}">${inner}</span>` : inner;
    case "link": {
      if (!isSafeUrl(mark.href)) {
        return inner;
      }
      const attrs = [`href="${escapeAttr(mark.href)}"`];
      if (mark.target === "_blank") {
        attrs.push('target="_blank"');
      }
      const rel = mark.rel?.filter((item) => ["nofollow", "noreferrer", "noopener"].includes(item)) ?? [];
      if (mark.target === "_blank" && !rel.includes("noopener")) {
        rel.push("noopener");
      }
      if (rel.length > 0) {
        attrs.push(`rel="${rel.join(" ")}"`);
      }
      return `<a ${attrs.join(" ")}>${inner}</a>`;
    }
    default:
      return inner;
  }
}

export function fromHTML(html: string): OraDocument {
  if (typeof DOMParser === "undefined") {
    throw new Error("fromHTML requiert DOMParser.");
  }
  const parser = new DOMParser();
  const dom = parser.parseFromString(`<div id="ora-root">${html}</div>`, "text/html");
  const root = dom.getElementById("ora-root") ?? dom.body;
  const blocks: OraNode[] = [];
  parseBlocks(root, blocks, 0);
  if (blocks.length === 0) {
    return createEmptyDocument();
  }
  return { version: 1, type: "doc", content: blocks };
}

function parseBlocks(root: ParentNode, out: OraNode[], listLevelValue: number): void {
  const inlineBuffer: OraNode[] = [];
  const flush = () => {
    if (inlineBuffer.length === 0) {
      return;
    }
    const merged = mergeInlines(inlineBuffer.splice(0));
    if (textOf(merged).trim() === "" && merged.every((n) => isText(n) && n.text.trim() === "")) {
      return;
    }
    out.push({ type: "paragraph", content: merged.length ? merged : [{ type: "text", text: "" }] });
  };

  root.childNodes.forEach((child) => {
    if (child.nodeType === Node.COMMENT_NODE) {
      return;
    }
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? "";
      if (text.trim() === "") {
        return;
      }
      inlineBuffer.push({ type: "text", text });
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    const el = child as Element;
    const tag = el.tagName;
    if (SKIP_TAGS.has(tag)) {
      return;
    }
    if (tag === "BR") {
      flush();
      return;
    }
    if (tag === "IMG" || tag === "FIGURE") {
      flush();
      const image = imageFromElement(el);
      if (image) {
        out.push(image);
      }
      return;
    }
    if (tag === "TABLE") {
      flush();
      out.push(tableFromElement(el));
      return;
    }
    if (tag === "VIDEO" || tag === "AUDIO") {
      flush();
      const src = el.getAttribute("src") ?? el.querySelector("source")?.getAttribute("src") ?? "";
      if (isSafeUrl(src)) {
        out.push({ type: tag === "VIDEO" ? "video" : "audio", attrs: { src } });
      }
      return;
    }
    if (tag === "IFRAME") {
      flush();
      const raw = el.getAttribute("src") ?? "";
      const src = isSafeEmbedUrl(raw) ? raw : youtubeToEmbed(raw);
      if (src && isSafeEmbedUrl(src)) {
        out.push({ type: "embed", attrs: { src } });
      }
      return;
    }
    if (tag === "UL" || tag === "OL") {
      flush();
      parseList(el, tag === "OL", listLevelValue, out);
      return;
    }
    if (tag === "PRE") {
      flush();
      out.push(elementWithAttrs("codeBlock", styleAttrs(el), [{ type: "text", text: el.textContent ?? "" }]));
      return;
    }
    if (tag === "BLOCKQUOTE") {
      flush();
      const inlines = mergeInlines(parseInlines(el, []));
      out.push(elementWithAttrs("blockquote", styleAttrs(el), inlines.length ? inlines : [{ type: "text", text: "" }]));
      return;
    }
    if (tag.startsWith("H") && tag.length === 2) {
      flush();
      const level = Number(tag[1]);
      const content = mergeInlines(parseInlines(el, []));
      out.push(elementWithAttrs(
        "heading",
        { level: Number.isFinite(level) ? Math.min(6, Math.max(1, level)) : 1, ...styleAttrs(el) },
        content.length ? content : [{ type: "text", text: "" }],
      ));
      return;
    }
    if (tag === "P" || tag === "DIV" || tag === "SECTION" || tag === "ARTICLE" || tag === "HEADER" || tag === "LI") {
      flush();
      const media = Array.from(el.querySelectorAll("img, table, video, audio, iframe, figure"));
      const clone = el.cloneNode(true) as Element;
      clone.querySelectorAll("img, table, video, audio, iframe, figure").forEach((node) => node.remove());
      const content = mergeInlines(parseInlines(clone, []));
      if (content.length > 0 && textOf(content).trim() !== "") {
        out.push(elementWithAttrs("paragraph", styleAttrs(el), content));
      }
      media.forEach((node) => parseBlocks(wrapTemp(node), out, listLevelValue));
      if (content.length === 0 && media.length === 0) {
        out.push(elementWithAttrs("paragraph", styleAttrs(el), [{ type: "text", text: "" }]));
      }
      return;
    }
    parseInlines(el, inlineBuffer);
  });
  flush();
}

function parseList(el: Element, ordered: boolean, level: number, out: OraNode[]): void {
  Array.from(el.children).forEach((child) => {
    if (child.tagName === "LI") {
      const nestedLists = Array.from(child.children).filter((node) => node.tagName === "UL" || node.tagName === "OL");
      const clone = child.cloneNode(true) as Element;
      Array.from(clone.children).forEach((node) => {
        if (node.tagName === "UL" || node.tagName === "OL") {
          node.remove();
        }
      });
      const content = mergeInlines(parseInlines(clone, []));
      out.push(elementWithAttrs(
        "listItem",
        { ordered, level, ...styleAttrs(child) },
        content.length ? content : [{ type: "text", text: "" }],
      ));
      nestedLists.forEach((list) => parseList(list, list.tagName === "OL", level + 1, out));
      return;
    }
    if (child.tagName === "UL" || child.tagName === "OL") {
      parseList(child, child.tagName === "OL", level, out);
    }
  });
}

function styleAttrs(el: Element): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  const style = el.getAttribute("style") ?? "";
  const alignAttr = el.getAttribute("align")?.toLowerCase();
  const textAlign = /(?:^|;)\s*text-align\s*:\s*([^;]+)/i.exec(style)?.[1]?.trim().toLowerCase() ?? alignAttr;
  if (textAlign === "left" || textAlign === "center" || textAlign === "right" || textAlign === "justify") {
    attrs.align = textAlign;
  }
  const margin = /(?:^|;)\s*margin-left\s*:\s*([\d.]+)(em|px|rem)/i.exec(style);
  if (margin?.[1]) {
    const value = Number(margin[1]);
    const unit = margin[2];
    const indent = unit === "px" ? Math.round(value / 24) : Math.round(value / 1.5);
    if (indent > 0) {
      attrs.indent = Math.min(8, indent);
    }
  }
  const lineHeight = /(?:^|;)\s*line-height\s*:\s*([\d.]+)/i.exec(style)?.[1];
  if (lineHeight) {
    attrs.lineHeight = lineHeight;
  }
  return attrs;
}

function elementWithAttrs(type: string, attrs: Record<string, unknown>, content: OraNode[]): OraElement {
  const node: OraElement = { type, content };
  if (Object.keys(attrs).length > 0) {
    node.attrs = attrs;
  }
  return node;
}

function parseInlines(el: Element, out: OraNode[], inherited: OraMark[] = []): OraNode[] {
  const marks = [...inherited, ...marksFromElement(el)];
  el.childNodes.forEach((child) => {
    if (child.nodeType === Node.COMMENT_NODE) {
      return;
    }
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? "";
      if (text === "") {
        return;
      }
      out.push(marks.length > 0 ? { type: "text", text, marks: normalizeMarks(marks) } : { type: "text", text });
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    const nested = child as Element;
    if (SKIP_TAGS.has(nested.tagName)) {
      return;
    }
    if (nested.tagName === "BR") {
      out.push({ type: "text", text: "\n" });
      return;
    }
    if (nested.tagName === "UL" || nested.tagName === "OL" || nested.tagName === "IMG" || nested.tagName === "TABLE" || nested.tagName === "VIDEO" || nested.tagName === "AUDIO" || nested.tagName === "IFRAME" || nested.tagName === "FIGURE") {
      return;
    }
    parseInlines(nested, out, marks);
  });
  if (el.childNodes.length === 0 && el.textContent) {
    out.push(marks.length ? { type: "text", text: el.textContent, marks: normalizeMarks(marks) } : { type: "text", text: el.textContent });
  }
  return out;
}

function marksFromElement(el: Element): OraMark[] {
  const marks: OraMark[] = [];
  const tag = el.tagName;
  if (tag === "STRONG" || tag === "B") {
    marks.push({ type: "bold" });
  }
  if (tag === "EM" || tag === "I") {
    marks.push({ type: "italic" });
  }
  if (tag === "U") {
    marks.push({ type: "underline" });
  }
  if (tag === "S" || tag === "STRIKE" || tag === "DEL") {
    marks.push({ type: "strike" });
  }
  if (tag === "CODE" && el.parentElement?.tagName !== "PRE") {
    marks.push({ type: "code" });
  }
  if (tag === "SUB") {
    marks.push({ type: "subscript" });
  }
  if (tag === "SUP") {
    marks.push({ type: "superscript" });
  }
  if (tag === "A") {
    const href = el.getAttribute("href") ?? "";
    if (isSafeUrl(href)) {
      const target = el.getAttribute("target") === "_blank" ? "_blank" : undefined;
      const rel = (el.getAttribute("rel") ?? "").split(/\s+/).filter(Boolean);
      marks.push({ type: "link", href, ...(target ? { target } : {}), ...(rel.length ? { rel } : {}) });
    }
  }
  const style = el.getAttribute("style") ?? "";
  const color = /(?:^|;)\s*color\s*:\s*([^;]+)/i.exec(style)?.[1]?.trim();
  const background = /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i.exec(style)?.[1]?.trim();
  const fontSize = /(?:^|;)\s*font-size\s*:\s*([^;]+)/i.exec(style)?.[1]?.trim();
  const fontFamily = /(?:^|;)\s*font-family\s*:\s*([^;]+)/i.exec(style)?.[1]?.trim();
  if (color && isSafeCssColor(color)) {
    marks.push({ type: "color", value: color });
  }
  if (background && isSafeCssColor(background)) {
    marks.push({ type: "background", value: background });
  }
  if (fontSize && isSafeFontSize(fontSize)) {
    marks.push({ type: "fontSize", value: fontSize });
  }
  if (fontFamily && isSafeFontFamily(fontFamily)) {
    marks.push({ type: "fontFamily", value: fontFamily });
  }
  return marks;
}

function mergeInlines(nodes: OraNode[]): OraNode[] {
  const result: OraNode[] = [];
  for (const node of nodes) {
    const last = result[result.length - 1];
    if (isText(node) && last && isText(last) && JSON.stringify(normalizeMarks(last.marks)) === JSON.stringify(normalizeMarks(node.marks))) {
      last.text += node.text;
    } else if (isText(node) || isElement(node)) {
      result.push(node);
    }
  }
  return result;
}

function textOf(nodes: OraNode[]): string {
  return nodes.map((node) => (isText(node) ? node.text : "")).join("");
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;");
}

function wrapTemp(node: Element): HTMLElement {
  const wrap = node.ownerDocument.createElement("div");
  wrap.appendChild(node.cloneNode(true));
  return wrap;
}

function imageFromElement(el: Element): OraElement | null {
  const img = el.tagName === "IMG" ? el : el.querySelector("img");
  if (!img) {
    return null;
  }
  const src = img.getAttribute("src") ?? "";
  if (!isSafeUrl(src)) {
    return null;
  }
  const attrs: Record<string, unknown> = { src };
  const alt = img.getAttribute("alt");
  if (alt) {
    attrs.alt = alt;
  }
  const title = img.getAttribute("title");
  if (title) {
    attrs.title = title;
  }
  const width = Number(img.getAttribute("width"));
  if (Number.isFinite(width) && width > 0) {
    attrs.width = width;
  }
  const caption = el.tagName === "FIGURE" ? el.querySelector("figcaption")?.textContent?.trim() : "";
  if (caption) {
    attrs.caption = caption;
  }
  const parentLink = img.closest("a");
  const href = parentLink?.getAttribute("href");
  if (href && isSafeUrl(href)) {
    attrs.href = href;
  }
  Object.assign(attrs, styleAttrs(el));
  return { type: "image", attrs };
}

function tableFromElement(el: Element): OraElement {
  const rows: OraElement[] = [];
  el.querySelectorAll("tr").forEach((tr) => {
    const cells: OraElement[] = [];
    Array.from(tr.children).forEach((cell) => {
      if (cell.tagName !== "TD" && cell.tagName !== "TH") {
        return;
      }
      const content = mergeInlines(parseInlines(cell, []));
      const attrs: Record<string, unknown> = {};
      if (cell.tagName === "TH") {
        attrs.header = true;
      }
      const colspan = Number(cell.getAttribute("colspan"));
      if (Number.isFinite(colspan) && colspan > 1) {
        attrs.colspan = Math.min(20, Math.round(colspan));
      }
      const rowspan = Number(cell.getAttribute("rowspan"));
      if (Number.isFinite(rowspan) && rowspan > 1) {
        attrs.rowspan = Math.min(50, Math.round(rowspan));
      }
      const bg = /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i.exec(cell.getAttribute("style") ?? "")?.[1]?.trim();
      if (bg && isSafeCssColor(bg)) {
        attrs.background = bg;
      }
      cells.push({
        type: "tableCell",
        attrs: Object.keys(attrs).length > 0 ? attrs : undefined,
        content: content.length ? content : [{ type: "text", text: "" }],
      });
    });
    if (cells.length > 0) {
      rows.push({ type: "tableRow", content: cells });
    }
  });
  return { type: "table", content: rows.length ? rows : [{ type: "tableRow", content: [emptyCellLike()] }] };
}

function emptyCellLike(): OraElement {
  return { type: "tableCell", content: [{ type: "text", text: "" }] };
}
