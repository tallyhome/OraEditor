import type { OraEditor } from "../api/OraEditor.js";
import type { AICapability } from "../ai/types.js";
import { walkTextPaths, getNode, isText, textContent } from "../document/index.js";
import { isTextSelection, selectionEdges } from "../selection/types.js";

const AI_KEYS: Record<AICapability, "aiCorrect" | "aiRewrite" | "aiTranslate" | "aiSummarize" | "aiExpand" | "aiSimplify" | "aiGenerate"> = {
  correct: "aiCorrect",
  rewrite: "aiRewrite",
  translate: "aiTranslate",
  summarize: "aiSummarize",
  expand: "aiExpand",
  simplify: "aiSimplify",
  generate: "aiGenerate",
};

export function mountAIPanel(editor: OraEditor, host: HTMLElement): () => void {
  const panel = document.createElement("div");
  panel.className = "ora-ai-panel";
  host.appendChild(panel);

  const paint = () => {
    panel.innerHTML = `
    <div class="ora-ai-head">
      <strong>${escapeText(editor.t("aiAssistant"))}</strong>
      <select data-provider aria-label="${escapeAttr(editor.t("aiProvider"))}"></select>
    </div>
    <div class="ora-ai-ops"></div>
    <p class="ora-ai-note"></p>
  `;
    bind();
    refresh();
  };

  const bind = () => {
    const select = panel.querySelector("select") as HTMLSelectElement;
    select.addEventListener("change", () => {
      editor.ai.activeId = select.value;
      refresh();
    });
  };

  const refresh = () => {
    const select = panel.querySelector("select") as HTMLSelectElement | null;
    const ops = panel.querySelector(".ora-ai-ops") as HTMLElement | null;
    const note = panel.querySelector(".ora-ai-note") as HTMLElement | null;
    if (!select || !ops || !note) {
      return;
    }
    select.innerHTML = "";
    for (const provider of editor.ai.list()) {
      const option = document.createElement("option");
      option.value = provider.id;
      option.textContent = provider.enabled === false ? `${provider.label} ${editor.t("aiSoon")}` : provider.label;
      option.disabled = provider.enabled === false;
      if (editor.ai.activeId === provider.id) {
        option.selected = true;
      }
      select.appendChild(option);
    }
    const active = editor.ai.active();
    ops.innerHTML = "";
    (Object.keys(AI_KEYS) as AICapability[]).forEach((op) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = editor.t(AI_KEYS[op]);
      button.disabled = !active || active.enabled === false || !active.capabilities.includes(op);
      button.addEventListener("click", () => {
        void editor.runAI(op);
      });
      ops.appendChild(button);
    });
    if (active?.locality === "oraai") {
      note.textContent = editor.t("aiNoteOra");
    } else if (active?.locality === "remote") {
      note.textContent = editor.t("aiNoteRemote");
    } else {
      note.textContent = editor.t("aiNoteLocal");
    }
  };

  paint();
  editor.refreshAIPanel = paint;
  return () => panel.remove();
}

export function extractAIFragments(editor: OraEditor, scope: "selection" | "block" | "document") {
  const doc = editor.getJSON();
  const selection = editor.getSelection();
  const paths = walkTextPaths(doc);
  let selected = paths;
  if (scope === "block" && isTextSelection(selection)) {
    const block = selection.anchor.path[0] ?? 0;
    selected = paths.filter((path) => path[0] === block);
  } else if (scope === "selection" && isTextSelection(selection)) {
    const { start, end } = selectionEdges(selection);
    selected = paths.filter((path) => {
      const a = path[0] ?? 0;
      return a >= (start.path[0] ?? 0) && a <= (end.path[0] ?? 0);
    });
  }
  return selected.map((path) => {
    const node = getNode(doc, path);
    return { path, text: isText(node) ? node.text : textContent(node) };
  }).filter((item) => item.text.trim().length > 0);
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}
