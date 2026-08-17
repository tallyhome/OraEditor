import type { OraEditor } from "../api/OraEditor.js";
import type { AICapability } from "../ai/types.js";
import { walkTextPaths, getNode, isText, textContent } from "../document/index.js";
import { isTextSelection, selectionEdges } from "../selection/types.js";

const LABELS: Record<AICapability, string> = {
  correct: "Corriger",
  rewrite: "Reformuler",
  translate: "Traduire",
  summarize: "Résumer",
  expand: "Développer",
  simplify: "Simplifier",
  generate: "Générer",
};

export function mountAIPanel(editor: OraEditor, host: HTMLElement): () => void {
  const panel = document.createElement("div");
  panel.className = "ora-ai-panel";
  panel.innerHTML = `
    <div class="ora-ai-head">
      <strong>Assistant IA</strong>
      <select data-provider aria-label="Fournisseur IA"></select>
    </div>
    <div class="ora-ai-ops"></div>
    <p class="ora-ai-note"></p>
  `;
  host.appendChild(panel);
  const select = panel.querySelector("select") as HTMLSelectElement;
  const ops = panel.querySelector(".ora-ai-ops") as HTMLElement;
  const note = panel.querySelector(".ora-ai-note") as HTMLElement;

  const refresh = () => {
    select.innerHTML = "";
    for (const provider of editor.ai.list()) {
      const option = document.createElement("option");
      option.value = provider.id;
      option.textContent = provider.enabled === false ? `${provider.label} (bientôt)` : provider.label;
      option.disabled = provider.enabled === false;
      if (editor.ai.activeId === provider.id) {
        option.selected = true;
      }
      select.appendChild(option);
    }
    const active = editor.ai.active();
    ops.innerHTML = "";
    (Object.keys(LABELS) as AICapability[]).forEach((op) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = LABELS[op];
      button.disabled = !active || active.enabled === false || !active.capabilities.includes(op);
      button.addEventListener("click", () => {
        void editor.runAI(op);
      });
      ops.appendChild(button);
    });
    if (active?.locality === "oraai") {
      note.textContent = "OraAI est prévu dans l’architecture mais n’est pas encore disponible.";
    } else if (active?.locality === "remote") {
      note.textContent = "Cette opération peut envoyer du texte vers un service distant (via le proxy hôte).";
    } else {
      note.textContent = "Opération locale : le document reste dans cet environnement.";
    }
  };

  select.addEventListener("change", () => {
    editor.ai.activeId = select.value;
    refresh();
  });
  refresh();
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
      const b = path[0] ?? 0;
      return b >= (start.path[0] ?? 0) && b <= (end.path[0] ?? 0);
    });
  }
  return selected
    .map((path) => {
      const node = getNode(doc, path);
      return isText(node) && node.text ? { path, text: node.text } : null;
    })
    .filter((item): item is { path: number[]; text: string } => item !== null);
}

export function documentPlainText(editor: OraEditor): string {
  return textContent({ type: "doc", content: editor.getJSON().content });
}
