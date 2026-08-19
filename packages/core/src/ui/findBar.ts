import type { OraEditor } from "../api/OraEditor.js";
import { findMatches, replaceInString, type TextMatch } from "../document/search.js";
import { getNode, isText } from "../document/index.js";

export function mountFindBar(editor: OraEditor, host: HTMLElement): () => void {
  const bar = document.createElement("div");
  bar.className = "ora-findbar";
  bar.hidden = true;
  const render = () => {
    bar.innerHTML = `
      <input type="search" data-find placeholder="${escapeAttr(editor.t("findPlaceholder"))}" aria-label="${escapeAttr(editor.t("findPlaceholder"))}">
      <span class="ora-findbar-count" data-count></span>
      <button type="button" data-prev title="${escapeAttr(editor.t("findPrev"))}">↑</button>
      <button type="button" data-next title="${escapeAttr(editor.t("findNext"))}">↓</button>
      <label class="ora-findbar-case" title="${escapeAttr(editor.t("matchCase"))}">
        <input type="checkbox" data-case>
        Aa
      </label>
      <input type="text" data-replace placeholder="${escapeAttr(editor.t("replacePlaceholder"))}" aria-label="${escapeAttr(editor.t("replacePlaceholder"))}">
      <button type="button" data-replace-one>${escapeText(editor.t("replace"))}</button>
      <button type="button" data-replace-all>${escapeText(editor.t("replaceAll"))}</button>
      <button type="button" data-close title="${escapeAttr(editor.t("closeFind"))}">×</button>
    `;
  };
  render();
  const toolbar = host.querySelector(".ora-toolbar");
  if (toolbar) {
    toolbar.after(bar);
  } else {
    host.insertBefore(bar, host.firstChild);
  }

  let matches: TextMatch[] = [];
  let index = 0;

  const findInput = () => bar.querySelector<HTMLInputElement>("[data-find]");
  const replaceInput = () => bar.querySelector<HTMLInputElement>("[data-replace]");
  const countEl = () => bar.querySelector("[data-count]");
  const caseInput = () => bar.querySelector<HTMLInputElement>("[data-case]");

  const refreshCount = () => {
    const el = countEl();
    if (!el) {
      return;
    }
    el.textContent = matches.length
      ? editor.t("findCount", { current: index + 1, total: matches.length })
      : "";
  };

  const collect = () => {
    const query = findInput()?.value ?? "";
    matches = findMatches(editor.getJSON(), query, caseInput()?.checked === true);
    if (matches.length === 0) {
      index = 0;
      refreshCount();
      return;
    }
    index = Math.min(index, matches.length - 1);
    refreshCount();
  };

  const selectMatch = (match: TextMatch) => {
    editor.dispatch(
      (tr) =>
        tr.setSelection({
          type: "text",
          anchor: { path: match.path, offset: match.start },
          focus: { path: match.path, offset: match.end },
        }),
      { history: false },
    );
    editor.focus();
  };

  const go = (delta: number) => {
    collect();
    if (matches.length === 0) {
      return;
    }
    index = (index + delta + matches.length) % matches.length;
    const match = matches[index];
    if (match) {
      selectMatch(match);
    }
    refreshCount();
  };

  const replaceCurrent = () => {
    const query = findInput()?.value ?? "";
    const replacement = replaceInput()?.value ?? "";
    if (!query) {
      return;
    }
    collect();
    const match = matches[index];
    if (!match) {
      return;
    }
    const node = getNode(editor.getJSON(), match.path);
    if (!isText(node)) {
      return;
    }
    editor.dispatch((tr) => {
      tr.setSelection({
        type: "text",
        anchor: { path: match.path, offset: match.start },
        focus: { path: match.path, offset: match.end },
      });
      tr.deleteSelection();
      tr.insertText(replacement);
      return tr;
    }, { kind: "other" });
    collect();
    if (matches[index]) {
      selectMatch(matches[index] as TextMatch);
    }
  };

  const replaceAll = () => {
    const query = findInput()?.value ?? "";
    const replacement = replaceInput()?.value ?? "";
    if (!query) {
      return;
    }
    const caseSensitive = caseInput()?.checked === true;
    editor.dispatch((tr) => {
      const paths = findMatches(tr.doc, query, caseSensitive)
        .map((match) => match.path)
        .filter((path, i, all) => all.findIndex((item) => item.join(".") === path.join(".")) === i);
      for (const path of [...paths].reverse()) {
        const node = getNode(tr.doc, path);
        if (!isText(node)) {
          continue;
        }
        tr.replaceTextAt(path, replaceInString(node.text, query, replacement, caseSensitive));
      }
      return tr;
    }, { kind: "other" });
    collect();
  };

  const onClick = (event: Event) => {
    const button = (event.target as HTMLElement).closest("button");
    if (!button || !bar.contains(button)) {
      return;
    }
    if (button.hasAttribute("data-prev")) {
      go(-1);
    } else if (button.hasAttribute("data-next")) {
      go(1);
    } else if (button.hasAttribute("data-replace-one")) {
      replaceCurrent();
    } else if (button.hasAttribute("data-replace-all")) {
      replaceAll();
    } else if (button.hasAttribute("data-close")) {
      hide();
    }
  };

  const onInput = (event: Event) => {
    if ((event.target as HTMLElement).hasAttribute("data-find") || (event.target as HTMLElement).hasAttribute("data-case")) {
      index = 0;
      collect();
      if (matches[0]) {
        selectMatch(matches[0]);
      }
    }
  };

  const onKey = (event: KeyboardEvent) => {
    if (bar.hidden || !bar.contains(event.target as Node)) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      hide();
    }
    if (event.key === "Enter") {
      event.preventDefault();
      go(event.shiftKey ? -1 : 1);
    }
  };

  const show = (focusReplace = false) => {
    bar.hidden = false;
    const input = focusReplace ? replaceInput() : findInput();
    input?.focus();
    input?.select();
    collect();
  };

  const hide = () => {
    bar.hidden = true;
    editor.focus();
  };

  bar.addEventListener("click", onClick);
  bar.addEventListener("input", onInput);
  bar.addEventListener("change", onInput);
  bar.addEventListener("keydown", onKey);

  editor.openFindBar = show;
  editor.refreshFindBar = render;

  return () => {
    bar.removeEventListener("click", onClick);
    bar.removeEventListener("input", onInput);
    bar.removeEventListener("change", onInput);
    bar.removeEventListener("keydown", onKey);
    bar.remove();
  };
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}
