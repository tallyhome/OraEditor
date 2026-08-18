<?php
/**
 * Réglages du kit. Ce fichier est interdit au web via .htaccess.
 * Pour l’IA : remplacez sk-REMPLACER par votre clé. Sinon l’éditeur marche déjà (mock).
 */
return [
    'openai_key' => 'sk-REMPLACER',
    'openai_model' => 'gpt-4o-mini',
    'openai_url' => 'https://api.openai.com/v1/chat/completions',
    'upload_dir' => __DIR__ . '/uploads',
    'upload_url' => null,
    'upload_max_bytes' => 8 * 1024 * 1024,
];
