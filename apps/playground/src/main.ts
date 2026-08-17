import OraEditor from "@ora-editor/core";
import "@ora-editor/core/style.css";
import "./style.css";

const editor = new OraEditor({
  element: "#editor",
  preset: "full",
  toolbar: true,
  content: `<h1>OraEditor</h1>
<p>Phase 3–13 : images, tableaux, médias, IA, presets Simple/Full.</p>
<figure><img src="https://picsum.photos/seed/ora/640/280" alt="Exemple"><figcaption>Image de démonstration</figcaption></figure>
<table>
  <tr><th>Colonne A</th><th>Colonne B</th></tr>
  <tr><td>Cellule 1</td><td>Cellule 2</td></tr>
</table>
<p>Un <a href="https://example.com">lien</a>, une liste :</p>
<ul><li>Puce</li><li>Autre</li></ul>`,
});

const jsonOut = document.getElementById("json-out");
const htmlOut = document.getElementById("html-out");

function refresh(): void {
  if (jsonOut) {
    jsonOut.textContent = JSON.stringify(editor.getJSON(), null, 2);
  }
  if (htmlOut) {
    htmlOut.textContent = editor.getHTML();
  }
}

editor.on("change", refresh);
editor.on("selectionChange", refresh);
editor.on("ready", refresh);
refresh();
