/**
 * Nettoyage HTML collé (Word, Google Docs) avant fromHTML / schéma.
 */
const FRAGMENT_START = "<!--StartFragment-->";
const FRAGMENT_END = "<!--EndFragment-->";

export function cleanPastedHtml(html: string): string {
  let source = extractFragment(html);
  source = source.replace(/<!--[\s\S]*?-->/g, "");
  source = source.replace(/<\/?(?:xml|w:|o:|v:|m:)[^>]*>/gi, "");
  if (typeof DOMParser === "undefined") {
    return source;
  }
  const parser = new DOMParser();
  const dom = parser.parseFromString(`<div id="ora-paste">${source}</div>`, "text/html");
  const root = dom.getElementById("ora-paste") ?? dom.body;
  root.querySelectorAll("script, style, meta, link, noscript, iframe, object, embed").forEach((el) => el.remove());
  unwrapGoogleDocsWrapper(root);
  cleanElement(root);
  return root.innerHTML;
}

export function cleanWordHtml(html: string): string {
  return cleanPastedHtml(html);
}

function extractFragment(html: string): string {
  const start = html.indexOf(FRAGMENT_START);
  const end = html.indexOf(FRAGMENT_END);
  if (start >= 0 && end > start) {
    return html.slice(start + FRAGMENT_START.length, end);
  }
  return html;
}

function unwrapGoogleDocsWrapper(root: Element): void {
  const guid = root.querySelector("[id^='docs-internal-guid-']");
  if (!guid || guid.parentElement !== root) {
    return;
  }
  while (guid.firstChild) {
    root.insertBefore(guid.firstChild, guid);
  }
  guid.remove();
}

function cleanElement(el: Element): void {
  Array.from(el.children).forEach((child) => cleanElement(child));
  if (el.tagName === "O:P" || el.tagName === "W:SDT") {
    unwrap(el);
    return;
  }
  stripJunkAttributes(el);
  cleanStyle(el);
  if (isDummyBold(el)) {
    unwrap(el);
  }
}

function stripJunkAttributes(el: Element): void {
  const keep = new Set(["href", "src", "target", "rel", "style", "colspan", "rowspan", "align", "id", "download", "data-mention"]);
  Array.from(el.attributes).forEach((attr) => {
    const name = attr.name.toLowerCase();
    if (name.startsWith("on") || name.startsWith("xmlns") || name === "lang") {
      el.removeAttribute(attr.name);
      return;
    }
    if (name.startsWith("data-") && name !== "data-mention") {
      el.removeAttribute(attr.name);
      return;
    }
    if (name === "class") {
      const kept = attr.value.split(/\s+/).filter((item) => item.startsWith("ora-")).join(" ");
      if (kept) {
        el.setAttribute("class", kept);
      } else {
        el.removeAttribute("class");
      }
      return;
    }
    if (!keep.has(name)) {
      el.removeAttribute(attr.name);
    }
  });
}

function cleanStyle(el: Element): void {
  const style = el.getAttribute("style");
  if (!style) {
    return;
  }
  const kept = style
    .split(";")
    .map((part) => part.trim())
    .filter((part) => {
      if (!part) {
        return false;
      }
      const prop = part.split(":")[0]?.trim().toLowerCase() ?? "";
      if (prop.startsWith("mso-") || prop.startsWith("-") || prop.includes("font-variant") || prop === "text-indent") {
        return false;
      }
      return ["color", "background", "background-color", "font-size", "font-family", "font-weight", "font-style", "text-align", "text-decoration", "margin-left", "line-height"].includes(prop);
    });
  if (kept.length === 0) {
    el.removeAttribute("style");
  } else {
    el.setAttribute("style", kept.join("; "));
  }
}

function isDummyBold(el: Element): boolean {
  if (el.tagName !== "B" && el.tagName !== "STRONG") {
    return false;
  }
  const weight = /(?:^|;)\s*font-weight\s*:\s*([^;]+)/i.exec(el.getAttribute("style") ?? "")?.[1]?.trim().toLowerCase();
  return weight === "normal" || weight === "400";
}

function unwrap(el: Element): void {
  const parent = el.parentNode;
  if (!parent) {
    return;
  }
  while (el.firstChild) {
    parent.insertBefore(el.firstChild, el);
  }
  el.remove();
}

export function identityPaste(html: string): string {
  return html;
}

export interface ClipboardHooks {
  onPasteHTML?: (html: string) => string;
}
