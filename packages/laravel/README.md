# OraEditor pour Laravel

Package Composer distinct. Le Core TypeScript reste ignorant de Laravel.

## Publication

```bash
composer require ora/laravel
php artisan vendor:publish --tag=ora-assets
php artisan vendor:publish --tag=ora-views
```

## Blade

```blade
<x-ora::editor :content="$doc" preset="full" wire-model="body" />
```

## Adapters hôte

- `UploadController` — stockage `public/ora-editor`, jamais de Base64
- `AiProxyController` — la clé API reste côté serveur
- Update Manager — à brancher sur un job Artisan, pas depuis le navigateur
