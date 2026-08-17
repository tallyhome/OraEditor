# OraEditor — Démarrage

OraEditor est un moteur d’édition TypeScript **autonome et offline**. Le runtime n’a besoin ni de npm, ni de CDN, ni de backend.

## Prérequis

- Node.js 20+
- npm

## Développement

```bash
npm install
npm test
npm run dev
```

Le playground s’ouvre sur `http://localhost:5173`.

## Build (script tag)

```bash
npm run build
```

Fichiers générés dans `packages/core/dist/` :

- `ora-editor.js`
- `ora-editor.mjs`
- `ora-editor.css`

Usage hôte (sans npm au runtime) :

```html
<div id="editor"></div>
<link rel="stylesheet" href="/assets/ora-editor/ora-editor.css">
<script src="/assets/ora-editor/ora-editor.js"></script>
<script>
  const editor = new OraEditor({ element: "#editor" });
</script>
```

## API minimale

```ts
import OraEditor from "@ora-editor/core";
import "@ora-editor/core/style.css";

const editor = new OraEditor({ element: "#editor", toolbar: true, preset: "full" });
editor.getJSON();
editor.setJSON(doc);
editor.getHTML();
editor.setHTML(html);
editor.undo();
editor.redo();
editor.on("change", () => {});
editor.destroy();
```

## Adapters hôte (stubs)

L’application hôte fournira plus tard :

- `uploadImage(file)` — stockage physique, jamais de Base64 par défaut
- `openMediaLibrary()` — médiathèque du projet hôte
- proxy IA — les clés secrètes ne doivent pas vivre dans le JS client

Le playground n’embarque pas d’upload production.
