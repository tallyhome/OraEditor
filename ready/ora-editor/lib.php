<?php
declare(strict_types=1);

function ora_config(): array
{
    $here = __DIR__ . '/config.php';
    $secrets = dirname(__DIR__, 2) . '/ora-secrets/config.php';
    $path = is_file($secrets) ? $secrets : $here;
    $config = is_file($path) ? require $path : [];
    if (!is_array($config)) {
        $config = [];
    }
    $script = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/ora-editor'));
    $base = rtrim($script, '/');
    if ($base === '' || $base === '.') {
        $base = '/ora-editor';
    }
    $config['upload_dir'] = $config['upload_dir'] ?? (__DIR__ . '/uploads');
    $config['upload_url'] = $config['upload_url'] ?? ($base . '/uploads');
    $config['upload_max_bytes'] = $config['upload_max_bytes'] ?? 8 * 1024 * 1024;
    return $config;
}
