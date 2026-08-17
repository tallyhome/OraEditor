<?php
/**
 * Proxy IA OraEditor.
 * Entrée  : { op, scope, fragments: [{ path, text }], language?, style?, instruction? }
 * Sortie  : { patches: [{ path, text }] }
 *
 * La clé OpenAI ne quitte pas ce script.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$configPath = dirname(__DIR__, 2) . '/ora-secrets/config.php';
if (!is_file($configPath)) {
    $configPath = __DIR__ . '/config.php';
}
if (!is_file($configPath)) {
    http_response_code(503);
    echo json_encode(['error' => 'config.php absent — copiez config.sample.php hors du web']);
    exit;
}
$config = require $configPath;
$key = (string) ($config['openai_key'] ?? '');
if ($key === '' || str_starts_with($key, 'sk-REMPLACER')) {
    http_response_code(503);
    echo json_encode(['error' => 'Clé IA absente côté hôte']);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'POST uniquement']);
    exit;
}

$raw = file_get_contents('php://input') ?: '';
$payload = json_decode($raw, true);
if (!is_array($payload) || empty($payload['op']) || empty($payload['fragments']) || !is_array($payload['fragments'])) {
    http_response_code(422);
    echo json_encode(['error' => 'Payload invalide']);
    exit;
}

$allowedOps = ['correct', 'rewrite', 'translate', 'summarize', 'expand', 'simplify', 'generate'];
if (!in_array($payload['op'], $allowedOps, true)) {
    http_response_code(422);
    echo json_encode(['error' => 'Opération inconnue']);
    exit;
}

$system = <<<TXT
Tu reçois un JSON { op, scope, fragments: [{ path, text }] }.
Applique l'opération au texte de chaque fragment.
Réponds UNIQUEMENT par un JSON : { "patches": [{ "path": [...], "text": "..." }] }.
Conserve la langue source sauf si op = translate.
Ne rajoute pas de markdown.
TXT;

$body = json_encode([
    'model' => $config['openai_model'] ?? 'gpt-4o-mini',
    'temperature' => 0.2,
    'response_format' => ['type' => 'json_object'],
    'messages' => [
        ['role' => 'system', 'content' => $system],
        ['role' => 'user', 'content' => json_encode($payload, JSON_UNESCAPED_UNICODE)],
    ],
], JSON_THROW_ON_ERROR);

$ch = curl_init((string) ($config['openai_url'] ?? 'https://api.openai.com/v1/chat/completions'));
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $key,
    ],
    CURLOPT_POSTFIELDS => $body,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 60,
]);
$response = curl_exec($ch);
$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Appel IA impossible', 'detail' => $curlError]);
    exit;
}

$decoded = json_decode($response, true);
$content = $decoded['choices'][0]['message']['content'] ?? '';
$parsed = is_string($content) ? json_decode($content, true) : null;

if (!is_array($parsed) || !isset($parsed['patches']) || !is_array($parsed['patches'])) {
    http_response_code(502);
    echo json_encode(['error' => 'Réponse modèle illisible', 'http' => $status]);
    exit;
}

echo json_encode(['patches' => $parsed['patches']], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
