# API publique

```ts
const editor = new OraEditor({
  element: "#editor",
  content?: OraDocument | string,
  editable?: boolean,
  toolbar?: boolean | HTMLElement,
  preset?: "simple" | "full",
  features?: { images?, tables?, media?, ai? },
  plugins?: OraPlugin[],
  uploadImage?: (file, ctx) => Promise<UploadedAsset>,
  openMediaLibrary?: (opts) => Promise<MediaItem[] | null>,
  aiProxyUrl?: string,
});
```

`preset: "simple"` : images + texte, pas de tableaux / médias / IA.  
`preset: "full"` (défaut) : tout le Core.

## Instance

| Méthode | Description |
|---|---|
| `getJSON()` / `setJSON(doc)` | Document Model |
| `getHTML()` / `setHTML(html)` | HTML subset sanitisé |
| `insertHTML(html)` | Fragment nettoyé (Word/Docs) |
| `insertImageFile(file)` | Upload + nœud `image` |
| `openLibrary(type)` | Médiathèque hôte |
| `runAI(op)` | Assistant IA (patches de texte) |
| `exec(name, args?)` | Commandes |
| `undo()` / `redo()` | Historique |
| `toggleFullscreen()` | Plein écran |
| `ui.addToolbarButton(spec)` | Bouton plugin |
| `destroy()` | Nettoyage |

## Commandes utiles

Texte : `insertText`, `toggleMark`, `setBlock`, `toggleList`, `setAlign`, `indent`, `setLink`  
Images / médias : `insertImage`, `insertVideo`, `insertAudio`, `insertEmbed`, `setNodeAttrs`  
Tableaux : `insertTable`, `tableAddRow`, `tableAddColumn`, `tableDeleteRow`, `tableDeleteColumn`

## Events

`ready`, `change`, `focus`, `blur`, `selectionChange`, `destroy`, `pluginLoaded`,  
`imageUploadStart` / `Success` / `Error`, `aiRequestStart` / `Success` / `Error`.

## Plugins

```ts
{
  id, name, version, compatibleCore,
  dependencies?: [string], // 1 max
  setup(editor) {
    editor.ui.addToolbarButton({ id: "hello", title: "Hello", label: "Hi", onClick: () => {} });
    editor.commands.register("hello", () => true);
    return () => {};
  }
}
```

## Presets npm

```ts
import { createSimpleEditor } from "@ora-editor/simple";
import { createFullEditor } from "@ora-editor/full";
```
