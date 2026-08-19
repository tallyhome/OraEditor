# API publique

```ts
const editor = new OraEditor({
  element: "#editor",
  content?: OraDocument | string,
  editable?: boolean,
  toolbar?: boolean | HTMLElement,
  preset?: "simple" | "full",
  features?: { images?, tables?, media?, ai? },
  locale?: "fr" | "en" | "ru" | "pt" | "es" | "it" | "de",
  placeholder?: string,
  plugins?: OraPlugin[],
  uploadImage?: (file, ctx) => Promise<UploadedAsset>,
  openMediaLibrary?: (opts) => Promise<MediaItem[] | null>,
  aiProxyUrl?: string,
});
```

`preset: "simple"` : images + texte, pas de tableaux / médias / IA.  
`preset: "full"` (défaut) : tout le Core.  
`locale` : toolbar, dialogs, recherche, compteur. Défaut = `<html lang>` (sinon `fr`).  
`placeholder` : texte affiché tant que le document est vide.

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
| `setLocale(locale)` | Traduit l’UI (FR/EN/RU/…) |
| `t(key)` | Chaîne i18n |
| `getStats()` | Mots / caractères |
| `openFindBar()` | Rechercher / remplacer (`Ctrl+F`) |
| `ui.addToolbarButton(spec)` | Bouton plugin |
| `destroy()` | Nettoyage |

## Commandes utiles

Texte : `insertText`, `toggleMark`, `setMark`, `removeMark`, `setBlock`, `toggleList`, `setAlign`, `indent`, `setLink`  
Images / médias : `insertImage`, `insertVideo`, `insertAudio`, `insertEmbed`, `setNodeAttrs`  
Tableaux : `insertTable`, `tableAddRow`, `tableAddColumn`, `tableDeleteRow`, `tableDeleteColumn`, `tableMergeRight`, `tableMergeDown`, `tableSplitCell`, `tableToggleHeaderRow`, `tableSetCellBackground`

Raccourcis Markdown en saisie : `# ` `## ` `- ` `1. ` `> ` `**gras**`.

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
