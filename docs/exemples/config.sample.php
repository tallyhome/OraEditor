<?php
/**
 * Copiez ce fichier HORS du document root, par exemple :
 *   /home/USER/ora-secrets/config.php
 * puis ajustez le require dans upload.php / ai-proxy.php.
 *
 * Ne commitez jamais le vrai config.php.
 */
return [
    'openai_key' => 'sk-REMPLACER',
    'openai_model' => 'gpt-4o-mini',
    'openai_url' => 'https://api.openai.com/v1/chat/completions',

    /** Dossier public des images, relatif au script upload.php par défaut. */
    'upload_dir' => __DIR__ . '/../public_html/ora-editor/uploads',
    'upload_url' => '/ora-editor/uploads',
    'upload_max_bytes' => 8 * 1024 * 1024,

    /** Jeton simple anti-CSRF (à comparer avec un champ de formulaire / header). */
    'csrf_token' => 'changer-moi',
];
