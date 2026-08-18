# Installer OraEditor dans un projet

> Guide HTML (cPanel, Webuzo, PHP, Laravel, WordPress, IA, Update Manager) : [`Docs/index.html`](index.html) — **FR, EN, PO/PT, ES, IT, RU, DE**.

Le moteur est un **fichier JS + CSS**. Il ne dépend pas de Laravel, React, WordPress, etc. L’hôte fournit seulement : un `<div>`, éventuellement un upload, un proxy IA, une médiathèque.

## 1. Copier les fichiers (tous les projets)

```bash
cd chemin/vers/OraEditor
npm install
npm run build
# optionnel : npm run package  →  dist/ora-editor/
```

Copier vers ton projet, par exemple :

- `public/ora-editor/ora-editor.js`
- `public/ora-editor/ora-editor.css`

```html
<link rel="stylesheet" href="/ora-editor/ora-editor.css">
<div id="editor"></div>
<script src="/ora-editor/ora-editor.js"></script>
<script>
  const editor = new OraEditor({
    element: "#editor",
    toolbar: true,
    preset: "full", // ou "simple"
  });
</script>
```

Avec npm dans une app JS :

```ts
import OraEditor from "@ora-editor/core";
import "@ora-editor/core/style.css";
```

Laravel : voir `packages/laravel/README.md` (`<x-ora::editor />`, publication des assets).

## 2. Update Manager — où il est, à quoi il sert

**Ce n’est pas un écran dans le navigateur.** Le navigateur ne peut pas écrire `public/ora-editor/`.

Emplacement : `packages/update-manager` (`@ora-editor/update-manager`).

C’est un **outil hôte** (Node / plus tard Artisan) :

1. lit un manifest GitHub (`ora-editor.manifest.json` : version, checksum SHA-256)
2. CHECK → COMPAT → BACKUP → DOWNLOAD → VERIFY → INSTALL → HEALTHCHECK
3. en échec : ROLLBACK

À brancher dans **ton** back-office (bouton « Mettre à jour OraEditor » qui lance un job serveur). Il n’y a pas encore d’UI admin livrée.

## 3. Configurer les IA

Les **clés API ne vont jamais dans le JS client**.

| Provider | Comment l’activer |
|---|---|
| **Mock** | Déjà actif (démo locale, sans réseau) |
| **OraAI** | Prévu, **grisé**, pas encore disponible |
| **OpenAI / API custom** | Passe `aiProxyUrl` vers **ton** backend |
| **Ollama (local)** | `createOllamaEngine()` + `createLocalProvider(engine)` puis `editor.ai.register(...)` |

Exemple production :

```js
const editor = new OraEditor({
  element: "#editor",
  toolbar: true,
  preset: "full",
  aiProxyUrl: "/ora-editor/ai", // route hôte
});
```

Le proxy (Laravel : `AiProxyController`) reçoit `{ op, scope, fragments }`, appelle OpenAI / autre avec la clé serveur, renvoie `{ patches: [{ path, text }] }`.

Dans l’éditeur Full, le **panneau Assistant IA** est sous la zone de texte (Corriger, Reformuler, Traduire…). Le menu déroulant choisit le provider.

## 4. Y a-t-il un dashboard ?

**Non.** Il n’existe pas de panel d’administration séparé (stats, utilisateurs, updates cliquables).

Ce qui existe aujourd’hui :

- **Playground** (`npm run dev`) — démo développeur
- **Panneau IA** — dans l’éditeur Full, sous le contenu
- **Update Manager** — code hôte, à relier à *ton* dashboard

Un vrai back-office (licences, canaux stable/beta, logs d’update) serait une phase produit à part, côté application hôte, pas dans le Core.
