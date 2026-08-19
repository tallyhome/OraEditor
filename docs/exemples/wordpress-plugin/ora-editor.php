<?php
/**
 * Plugin Name: OraEditor
 * Description: Embarque OraEditor (shortcode + metabox + REST upload/IA).
 * Version: 0.1.3,
 * Requires at least: 6.4
 * Requires PHP: 8.1
 */

declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

const ORA_EDITOR_VERSION = '0.1.3';

add_action('admin_menu', static function (): void {
    add_options_page('OraEditor', 'OraEditor', 'manage_options', 'ora-editor', 'ora_editor_settings_page');
});

add_action('admin_init', static function (): void {
    register_setting('ora_editor', 'ora_openai_key', [
        'type' => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'default' => '',
        'show_in_rest' => false,
    ]);
});

function ora_editor_settings_page(): void
{
    if (!current_user_can('manage_options')) {
        return;
    }
    echo '<div class="wrap"><h1>OraEditor</h1><form method="post" action="options.php">';
    settings_fields('ora_editor');
    $key = (string) get_option('ora_openai_key', '');
    echo '<table class="form-table"><tr><th>Clé OpenAI</th><td>';
    echo '<input type="password" class="regular-text" name="ora_openai_key" value="' . esc_attr($key) . '" autocomplete="off">';
    echo '<p class="description">Jamais exposée au navigateur. Utilisée uniquement par <code>/wp-json/ora-editor/v1/ai</code>.</p>';
    echo '</td></tr></table>';
    submit_button();
    echo '</form></div>';
}

add_action('wp_enqueue_scripts', 'ora_editor_register_assets');
add_action('admin_enqueue_scripts', 'ora_editor_register_assets');

function ora_editor_register_assets(): void
{
    $base = plugin_dir_url(__FILE__) . 'assets/';
    wp_register_style('ora-editor', $base . 'ora-editor.css', [], ORA_EDITOR_VERSION);
    wp_register_script('ora-editor', $base . 'ora-editor.js', [], ORA_EDITOR_VERSION, true);
}

add_shortcode('ora_editor', static function (array $atts): string {
    $atts = shortcode_atts([
        'id' => 'ora-editor',
        'preset' => 'full',
        'content' => '',
    ], $atts);
    wp_enqueue_style('ora-editor');
    wp_enqueue_script('ora-editor');
    $rest = [
        'upload' => rest_url('ora-editor/v1/upload'),
        'ai' => rest_url('ora-editor/v1/ai'),
        'nonce' => wp_create_nonce('wp_rest'),
        'locale' => str_replace('_', '-', determine_locale()),
    ];
    wp_add_inline_script('ora-editor', 'window.oraEditorRest = ' . wp_json_encode($rest) . ';', 'before');
    $id = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $atts['id']) ?: 'ora-editor';
    $preset = $atts['preset'] === 'simple' ? 'simple' : 'full';
    $initial = wp_json_encode((string) $atts['content']);
    $boot = <<<JS
document.addEventListener("DOMContentLoaded", function () {
  if (typeof OraEditor === "undefined") return;
  const rest = window.oraEditorRest || {};
  const editor = new OraEditor({
    element: "#{$id}",
    toolbar: true,
    preset: "{$preset}",
    locale: rest.locale || document.documentElement.lang || "fr",
    content: {$initial},
    aiProxyUrl: rest.ai,
    uploadImage: async function (file) {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(rest.upload, {
        method: "POST",
        headers: { "X-WP-Nonce": rest.nonce },
        body,
        credentials: "same-origin",
      });
      return res.json();
    },
  });
  window.oraEditor = editor;
});
JS;
    wp_add_inline_script('ora-editor', $boot);
    return '<div id="' . esc_attr($id) . '"></div>';
});

add_action('add_meta_boxes', static function (): void {
    add_meta_box('ora_editor_box', 'Contenu OraEditor', 'ora_editor_metabox', ['post', 'page'], 'normal', 'high');
});

function ora_editor_metabox(\WP_Post $post): void
{
    wp_enqueue_style('ora-editor');
    wp_enqueue_script('ora-editor');
    $rest = [
        'upload' => rest_url('ora-editor/v1/upload'),
        'ai' => rest_url('ora-editor/v1/ai'),
        'nonce' => wp_create_nonce('wp_rest'),
        'locale' => str_replace('_', '-', determine_locale()),
    ];
    wp_add_inline_script('ora-editor', 'window.oraEditorRest = ' . wp_json_encode($rest) . ';', 'before');
    $json = (string) get_post_meta($post->ID, '_ora_document', true);
    wp_nonce_field('ora_editor_save', 'ora_editor_nonce');
    echo '<div id="ora-editor-admin"></div>';
    echo '<textarea name="ora_document" id="ora_document" class="hidden" style="display:none">' . esc_textarea($json) . '</textarea>';
    echo '<textarea name="ora_html" id="ora_html" class="hidden" style="display:none"></textarea>';
    $contentJs = $json !== '' ? $json : '""';
    $boot = <<<JS
document.addEventListener("DOMContentLoaded", function () {
  if (typeof OraEditor === "undefined") return;
  const rest = window.oraEditorRest || {};
  let initial = {$contentJs};
  try { if (typeof initial === "string" && initial) initial = JSON.parse(initial); } catch (e) {}
  const editor = new OraEditor({
    element: "#ora-editor-admin",
    toolbar: true,
    preset: "full",
    locale: rest.locale || document.documentElement.lang || "fr",
    content: initial || "",
    aiProxyUrl: rest.ai,
    uploadImage: async function (file) {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(rest.upload, {
        method: "POST",
        headers: { "X-WP-Nonce": rest.nonce },
        body,
        credentials: "same-origin",
      });
      return res.json();
    },
  });
  const form = document.getElementById("post");
  form?.addEventListener("submit", function () {
    document.getElementById("ora_document").value = JSON.stringify(editor.getJSON());
    document.getElementById("ora_html").value = editor.getHTML();
  });
});
JS;
    wp_add_inline_script('ora-editor', $boot);
}

add_action('save_post', static function (int $postId): void {
    if (!isset($_POST['ora_editor_nonce']) || !wp_verify_nonce(sanitize_text_field((string) $_POST['ora_editor_nonce']), 'ora_editor_save')) {
        return;
    }
    if (!current_user_can('edit_post', $postId)) {
        return;
    }
    if (isset($_POST['ora_document'])) {
        $raw = wp_unslash((string) $_POST['ora_document']);
        json_decode($raw);
        if (json_last_error() === JSON_ERROR_NONE) {
            update_post_meta($postId, '_ora_document', $raw);
        }
    }
    if (isset($_POST['ora_html'])) {
        update_post_meta($postId, '_ora_html', wp_kses_post(wp_unslash((string) $_POST['ora_html'])));
    }
});

add_action('rest_api_init', static function (): void {
    register_rest_route('ora-editor/v1', '/upload', [
        'methods' => 'POST',
        'permission_callback' => static fn () => current_user_can('upload_files'),
        'callback' => 'ora_editor_rest_upload',
    ]);
    register_rest_route('ora-editor/v1', '/ai', [
        'methods' => 'POST',
        'permission_callback' => static fn () => is_user_logged_in(),
        'callback' => 'ora_editor_rest_ai',
    ]);
});

function ora_editor_rest_upload(\WP_REST_Request $request): \WP_REST_Response
{
    $files = $request->get_file_params();
    if (empty($files['file'])) {
        return new \WP_REST_Response(['error' => 'Fichier manquant'], 422);
    }
    require_once ABSPATH . 'wp-admin/includes/file.php';
    $uploaded = wp_handle_upload($files['file'], ['test_form' => false]);
    if (!empty($uploaded['error'])) {
        return new \WP_REST_Response(['error' => $uploaded['error']], 400);
    }
    return new \WP_REST_Response([
        'url' => $uploaded['url'],
        'alt' => basename((string) $uploaded['file']),
    ]);
}

function ora_editor_rest_ai(\WP_REST_Request $request): \WP_REST_Response
{
    $key = (string) get_option('ora_openai_key', '');
    if ($key === '') {
        return new \WP_REST_Response(['error' => 'Clé IA absente côté hôte'], 503);
    }
    $payload = $request->get_json_params();
    if (!is_array($payload) || empty($payload['op']) || empty($payload['fragments'])) {
        return new \WP_REST_Response(['error' => 'Payload invalide'], 422);
    }
    $system = 'Tu reçois un JSON { op, scope, fragments }. Réponds UNIQUEMENT { "patches": [{ "path", "text" }] }.';
    $response = wp_remote_post('https://api.openai.com/v1/chat/completions', [
        'headers' => [
            'Authorization' => 'Bearer ' . $key,
            'Content-Type' => 'application/json',
        ],
        'timeout' => 60,
        'body' => wp_json_encode([
            'model' => 'gpt-4o-mini',
            'response_format' => ['type' => 'json_object'],
            'messages' => [
                ['role' => 'system', 'content' => $system],
                ['role' => 'user', 'content' => wp_json_encode($payload)],
            ],
        ]),
    ]);
    if (is_wp_error($response)) {
        return new \WP_REST_Response(['error' => $response->get_error_message()], 502);
    }
    $body = json_decode((string) wp_remote_retrieve_body($response), true);
    $content = $body['choices'][0]['message']['content'] ?? '';
    $parsed = is_string($content) ? json_decode($content, true) : null;
    if (!is_array($parsed) || empty($parsed['patches'])) {
        return new \WP_REST_Response(['error' => 'Réponse modèle illisible'], 502);
    }
    return new \WP_REST_Response(['patches' => $parsed['patches']]);
}
