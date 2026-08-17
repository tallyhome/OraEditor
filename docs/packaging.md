# Packaging et distribution

```bash
npm run build
npm run package
```

Produit `dist/ora-editor/` :

- `ora-editor.js` (IIFE, script tag)
- `ora-editor.mjs` (ESM)
- `ora-editor.css`
- `ora-editor.manifest.json` (version, canal, checksums SHA-256)

L’Update Manager hôte (`@ora-editor/update-manager`) consomme ce manifest : CHECK → COMPAT → BACKUP → DOWNLOAD → VERIFY → INSTALL → HEALTHCHECK, sinon ROLLBACK.

Canaux : `stable`, `beta`, `nightly`.

npm : `@ora-editor/core`, `@ora-editor/simple`, `@ora-editor/full`.  
Composer : `ora/laravel`.
