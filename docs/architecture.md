# Architecture

OraEditor est un **écosystème** autour d’un unique moteur : le Core. Simple et Full sont des presets, pas des forks.

```
Hôte (Laravel, PHP, Node, WebView, offline)
        │
   Simple / Full   (bundles)
        │
      Core
        │
   Document Model  ← source de vérité
        │
   Transactions → History → Renderer (DOM)
```

## Principes

1. Le **Document Model JSON** est la source de vérité. Le DOM n’est qu’une vue.
2. Toute mutation passe par une **transaction** (opérations inversibles).
3. Le Core n’importe ni React, ni Vue, ni Laravel, ni aucun CDN.
4. Les features fondamentales (texte, titres, images, tableaux, médias) sont **natives**.
5. Les plugins étendent le Core via une API publique, sans graphe de dépendances profond.
6. L’IA (Phase 8+) transforme le Document Model, jamais un blob HTML.
7. L’Update Manager (Phase 11) est un **outil hôte** : le navigateur ne peut pas écrire `public/ora-editor/`.

## Couches

| Couche | Rôle |
|---|---|
| Host adapters | Upload, médiathèque, proxy IA, filesystem |
| API publique | `OraEditor`, events, plugins |
| Core | schéma, transactions, sélection, historique, commandes |
| View | mapping Model ↔ DOM, `beforeinput`, patch de blocs |
| Features | texte (Phase 1), images, tableaux, médias |
| Plugins | extensions communautaires / métier |
| AI / Update | packages et modules satellites |

## Packages (monorepo npm)

- `@ora-editor/core` — moteur
- `@ora-editor/simple` — preset compact
- `@ora-editor/full` — preset complet + IA
- `@ora-editor/update-manager` — outil hôte (CLI / Node), jamais importé par le Core runtime
- `ora/laravel` — Blade, upload, proxy IA
- `@ora-editor/playground` — démo offline

## Pourquoi un moteur natif

Le format public (JSON versionné, transforms IA, plugins) doit nous appartenir. ProseMirror / TipTap imposeraient un double modèle. Le risque (IME, Safari, tableaux) est accepté et mitigé par des phases strictes et des tests du modèle sans DOM.
