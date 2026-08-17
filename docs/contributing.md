# Contribuer

## Phases

Les phases 1–13 sont en place dans le monorepo. Toute nouvelle feature doit rester dans le Core, une feature officielle, ou un plugin (une dépendance max).

Avant une feature importante :

1. Vérifier si elle est Core, feature officielle, ou plugin
2. Éviter les duplications
3. Préserver l’API publique
4. Écrire des tests
5. Documenter les choix

## Tests

```bash
npm test
```

Vitest + happy-dom. Tests colocalisés `*.test.ts` + `tests/integration.test.ts`.

## Style

- TypeScript `strict`
- Aucune dépendance runtime dans le Core
- Pas de mutation DOM hors du renderer
- Pas d’`innerHTML` sur du contenu utilisateur comme source de vérité

## Dépendances externes

Pour chaque librairie envisagée : utilité, taille, licence, maintenance, sécurité, offline, perf, faisabilité native. Préférer le natif.
