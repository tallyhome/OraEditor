# Document Model

Format public **JSON**, arbre de nœuds, versionné indépendamment du SemVer du package.

## Version

`document.version` (entier) ≠ version npm. Phase actuelle : `version: 1`.

## Schéma v1

Blocs texte : `paragraph`, `heading`, `blockquote`, `codeBlock`, `listItem` → `inline*`

Blocs atomiques : `image`, `video`, `audio`, `embed` → pas d’enfants texte

Tableau : `table` → `tableRow` → `tableCell` → `inline*`

Marks : `bold`, `italic`, `underline`, `strike`, `code`, `sub`/`sup`, couleurs, polices, `link`

Attrs image : `src`, `alt`, `title`, `caption`, `href`, `align`, `width`, `height`, `border`, `shadow`, `margin`, `uploading`

Les listes restent plates (`listItem` + `level`). Les tableaux sont un seul enfant DOM (mapping 1:1 au top-level).

## Converters

- `toJSON` / `fromJSON` — canonique
- `toHTML` / `fromHTML` — subset + sanitization schéma
- `cleanPastedHtml` — Word / Google Docs

Le HTML n’est jamais considéré comme sûr. `javascript:`, `data:`, SVG scripté et iframes hors YouTube/Vimeo sont refusés.
