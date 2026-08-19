import type { OraEditor } from "../api/OraEditor.js";
import { documentStats } from "../document/search.js";

export function mountStatusBar(editor: OraEditor, host: HTMLElement): () => void {
  const bar = document.createElement("div");
  bar.className = "ora-statusbar";
  host.appendChild(bar);

  const refresh = () => {
    const stats = documentStats(editor.getJSON());
    bar.textContent = `${editor.t("words", { n: stats.words })} · ${editor.t("characters", { n: stats.characters })}`;
  };

  const offChange = editor.on("change", refresh);
  refresh();
  editor.refreshStatusBar = refresh;

  return () => {
    offChange();
    bar.remove();
  };
}
