<?php
/**
 * Upload OraEditor — réponse { url, alt }.
 * Protégez cette URL (session, nonce, login).
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$configPath = dirname(__DIR__, 2) . '/ora-secrets/config.php';
if (!is_file($configPath)) {
    $configPath = __DIR__ . '/config.php';
}
$config = is_file($configPath) ? require $configPath : [
    'upload_dir' => __DIR__ . '/uploads',
    'upload_url' => '/ora-editor/uploads',
    'upload_max_bytes' => 8 * 1024 * 1024,
];

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

$max = (int) ($config['upload_max_bytes'] ?? 8 * 1024 * 1024);
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
$dest = $dir . DIRECTORY_SEPARATOR . $name;
if (!move_uploaded_file($file['tmp_name'], $dest)) {
    http_response_code(500);
    echo json_encode(['error' => 'Impossible d’enregistrer le fichier']);
    exit;
}

$base = rtrim((string) $config['upload_url'], '/');
echo json_encode([
    'url' => $base . '/' . $name,
    'alt' => basename((string) $file['name']),
], JSON_UNESCAPED_SLASHES);
