<?php
declare(strict_types=1);

require __DIR__ . '/lib.php';

header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'POST uniquement']);
    exit;
}

if (empty($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
    http_response_code(422);
    echo json_encode(['error' => 'Fichier manquant']);
    exit;
}

$file = $_FILES['file'];
if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    http_response_code(422);
    echo json_encode(['error' => 'Échec upload']);
    exit;
}

$config = ora_config();
$max = (int) $config['upload_max_bytes'];
if (($file['size'] ?? 0) > $max) {
    http_response_code(413);
    echo json_encode(['error' => 'Fichier trop volumineux']);
    exit;
}

$allowed = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/gif' => 'gif',
    'image/webp' => 'webp',
];
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']) ?: '';
if (!isset($allowed[$mime])) {
    http_response_code(415);
    echo json_encode(['error' => 'Type d’image non autorisé']);
    exit;
}

$dir = rtrim((string) $config['upload_dir'], '/\\');
if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
    http_response_code(500);
    echo json_encode(['error' => 'Dossier uploads introuvable']);
    exit;
}

$name = bin2hex(random_bytes(16)) . '.' . $allowed[$mime];
if (!move_uploaded_file($file['tmp_name'], $dir . DIRECTORY_SEPARATOR . $name)) {
    http_response_code(500);
    echo json_encode(['error' => 'Impossible d’enregistrer le fichier']);
    exit;
}

echo json_encode([
    'url' => rtrim((string) $config['upload_url'], '/') . '/' . $name,
    'alt' => basename((string) $file['name']),
], JSON_UNESCAPED_SLASHES);
