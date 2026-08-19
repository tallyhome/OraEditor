import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const PAGES = [
  "index",
  "installation",
  "cpanel",
  "webuzo",
  "serveur-web",
  "php",
  "laravel",
  "wordpress",
  "ia",
  "update-manager",
  "api",
  "faq",
];

const SNIPPETS = {
  htmlInit: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="/ora-editor/ora-editor.css">
</head>
<body>
  <div id="editor"></div>
  <textarea name="body" id="body" hidden></textarea>
  <script src="/ora-editor/ora-editor.js"></script>
  <script>
    const editor = new OraEditor({
      element: "#editor",
      toolbar: true,
      preset: "full",
      locale: document.documentElement.lang || "fr",
    });
    document.querySelector("form")?.addEventListener("submit", function () {
      document.getElementById("body").value = JSON.stringify(editor.getJSON());
    });
  </script>
</body>
</html>`,
  npmImport: `import OraEditor from "@ora-editor/core";
import "@ora-editor/core/style.css";
const editor = new OraEditor({ element: "#editor", toolbar: true, preset: "full" });`,
  cpanelInit: `<link rel="stylesheet" href="/ora-editor/ora-editor.css">
<div id="editor"></div>
<script src="/ora-editor/ora-editor.js"></script>
<script>
  new OraEditor({
    element: "#editor",
    toolbar: true,
    preset: "full",
    uploadImage: async function (file) {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/ora-editor/upload.php", { method: "POST", body });
      return res.json();
    },
    aiProxyUrl: "/ora-editor/ai-proxy.php",
  });
</script>`,
  tree: `/var/www/site/
  public/
    ora-editor/
      ora-editor.js
      ora-editor.css
      ora-editor.manifest.json
      uploads/
  secrets/
    ora-config.php
  bin/
    ora-update.mjs`,
  uploadJson: `{ "url": "https://example.com/ora-editor/uploads/abc.webp", "alt": "photo.png" }`,
  aiReq: `{
  "op": "correct",
  "scope": "selection",
  "fragments": [{ "path": [0, 0], "text": "Hello   world" }]
}`,
  aiRes: `{ "patches": [{ "path": [0, 0], "text": "Hello world" }] }`,
};

function wrap(lang, page, title, inner) {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — OraEditor</title>
  <link rel="stylesheet" href="../assets/docs.css">
</head>
<body data-lang="${lang}" data-page="${page}.html">
  <div class="layout">
    <aside class="sidebar" id="sidebar"></aside>
    <main class="content">
${inner}
    </main>
  </div>
  <script src="../assets/nav.js"></script>
</body>
</html>
`;
}

function pre(code) {
  return `<pre><code>${code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`;
}

const T = {
  en: {
    index: ["Home", `<p class="kicker">Host documentation</p>
<h1>Install and run OraEditor</h1>
<p class="lead">The folder <code>ready/ora-editor/</code> is <strong>already built</strong>: JS, CSS, demo page, upload and AI proxy. Copy it into your project — no Node, no npm.</p>
<div class="cards">
  <a class="card" href="installation.html"><h3>1. Ready kit</h3><p>Copy <code>ready/ora-editor/</code> — no npm.</p></a>
  <a class="card" href="cpanel.html"><h3>2. Hosting</h3><p>cPanel, Webuzo, Apache, Nginx, IIS, Plesk.</p></a>
  <a class="card" href="php.html"><h3>3. PHP / Laravel / WP</h3><p>Same kit, or the Laravel / WordPress extras.</p></a>
  <a class="card" href="ia.html"><h3>4. AI keys</h3><p>Optional: edit config.php. Mock works without a key.</p></a>
  <a class="card" href="update-manager.html"><h3>5. Update Manager</h3><p>Or just re-upload JS/CSS from <code>ready/</code>.</p></a>
</div>
<h2>What OraEditor is not</h2>
<ul>
  <li>It is <strong>not</strong> a CMS. No accounts, no admin dashboard ships with it.</li>
  <li>It is <strong>not</strong> an official WordPress plugin (you can still embed it — see <a href="wordpress.html">WordPress</a>).</li>
  <li>The Update Manager is <strong>not</strong> a button in the editor. It is a host tool (Node / Artisan / cron).</li>
  <li>OpenAI / Anthropic keys must <strong>never</strong> live in public JS.</li>
</ul>
<h2>Requirements</h2>
<table><thead><tr><th>To…</th><th>You need</th></tr></thead><tbody>
<tr><td>Build the files</td><td>Node.js 20+ and npm, once, on a build machine</td></tr>
<tr><td>Show the editor</td><td>A web server that serves HTML + JS + CSS (HTTPS recommended)</td></tr>
<tr><td>Upload images</td><td>A host route (PHP, Laravel, WP-REST…) that writes to disk</td></tr>
<tr><td>Use AI in production</td><td>A server proxy + a key in a <code>.env</code> outside the web root</td></tr>
<tr><td>Auto-update</td><td>Node (or an Artisan job) with write access to the assets folder</td></tr>
</tbody></table>
<div class="ok">The developer playground is <code>npm run dev</code> (port 5173). This documentation is about <strong>deploying into a real project</strong>.</div>
<h2>Architecture in one sentence</h2>
<p>The <strong>JSON Document Model</strong> is the source of truth. The DOM is only a view. The host stores that JSON (or sanitized HTML) and serves <code>ora-editor.js</code> + <code>ora-editor.css</code>.</p>
<footer class="page-foot">OraEditor 0.1 — open this folder in a browser.</footer>`],
    installation: ["Installation", `<p class="kicker">Start</p>
<h1>Installation</h1>
<p class="lead">The folder <code>ready/ora-editor/</code> is <strong>already compiled</strong> (editor, upload, AI proxy, demo page). You do not build anything.</p>
<div class="ok">Copy <code>ready/ora-editor/</code> to your web root (<code>public_html/ora-editor/</code>, <code>public/ora-editor/</code>, …) then open <code>editeur.html</code>.</div>
<h2>What is in the kit</h2>
<table><thead><tr><th>File</th><th>Role</th></tr></thead><tbody>
<tr><td><code>ora-editor.js</code> + <code>.css</code></td><td>Editor (already built)</td></tr>
<tr><td><code>editeur.html</code></td><td>Working page, toolbar + upload + AI</td></tr>
<tr><td><code>upload.php</code></td><td>Saves images into <code>uploads/</code></td></tr>
<tr><td><code>ai-proxy.php</code></td><td>OpenAI proxy (key in config.php)</td></tr>
<tr><td><code>config.php</code></td><td>Settings — blocked from the web by <code>.htaccess</code></td></tr>
<tr><td><code>uploads/</code></td><td>Image folder, already created</td></tr>
</tbody></table>
<h2>Where to put it</h2>
<table><thead><tr><th>Project</th><th>Destination</th><th>URL</th></tr></thead><tbody>
<tr><td>cPanel / Webuzo / FTP</td><td><code>public_html/ora-editor/</code></td><td><code>/ora-editor/editeur.html</code></td></tr>
<tr><td>PHP / Apache / Nginx</td><td>document root + <code>ora-editor/</code></td><td>same</td></tr>
<tr><td>Laravel</td><td><code>public/ora-editor/</code></td><td><code>/ora-editor/editeur.html</code></td></tr>
<tr><td>WordPress</td><td>see <a href="wordpress.html">the plugin</a> (copy JS/CSS from the kit)</td><td>shortcode</td></tr>
</tbody></table>
<p>See <code>ready/LIRE-MOI.txt</code> (3 steps). Optional OpenAI: replace <code>sk-REMPLACER</code> in <code>config.php</code>. The editor works without a key (mock AI).</p>
<h2>Developers only</h2>
<p>Rebuild JS/CSS (not needed to install):</p>
${pre("npm install\nnpm run build\nnpm run package")}
<p>That updates <code>ready/ora-editor/ora-editor.js</code> and <code>.css</code>.</p>
<footer class="page-foot"><a href="cpanel.html">cPanel</a> · <a href="webuzo.html">Webuzo</a> · <a href="serveur-web.html">web server</a></footer>`],
    cpanel: ["Install on cPanel", `<p class="kicker">Hosting</p>
<h1>cPanel</h1>
<p class="lead">Everything is already compiled in <code>ready/ora-editor/</code>. No Node, no <code>npm run build</code>.</p>
<div class="ok">The kit includes JS, CSS, <code>editeur.html</code>, upload, AI proxy, <code>config.php</code> and <code>uploads/</code>.</div>
<h2>3 steps</h2>
<ol class="steps">
  <li>cPanel → <strong>File Manager</strong> → <code>public_html</code>.</li>
  <li>Upload the folder <code>ready/ora-editor/</code> as-is.</li>
  <li>Open <code>https://your-site/ora-editor/editeur.html</code>.</li>
</ol>
<p>Optional AI: edit <code>config.php</code>, replace <code>sk-REMPLACER</code>. The file is blocked by <code>.htaccess</code>.</p>
<footer class="page-foot"><a href="installation.html">Ready kit</a> · <a href="ia.html">AI key</a></footer>`],
    webuzo: ["Install on Webuzo", `<p class="kicker">Hosting</p>
<h1>Webuzo</h1>
<p class="lead">Same as cPanel: upload the already-built kit <code>ready/ora-editor/</code> into <code>public_html</code>. Nothing to compile.</p>
<ol class="steps">
  <li>File Manager → <code>public_html</code>.</li>
  <li>Upload <code>ready/ora-editor/</code> as-is.</li>
  <li>Open <code>/ora-editor/editeur.html</code>.</li>
</ol>
<footer class="page-foot"><a href="cpanel.html">cPanel</a></footer>`],
    "serveur-web": ["Apache, Nginx, IIS", `<p class="kicker">Hosting</p>
<h1>Apache, Nginx, IIS and others</h1>
<p class="lead">Copy <code>ready/ora-editor/</code> into the document root. Already built: JS, CSS, <code>editeur.html</code>, upload, AI proxy.</p>
<h2>Recommended tree</h2>
${pre(SNIPPETS.tree)}
<h2>Checklist</h2>
<table><thead><tr><th>Item</th><th>Why</th></tr></thead><tbody>
<tr><td>HTTPS</td><td>Clipboard, session cookies for the proxy</td></tr>
<tr><td>Upload size limits</td><td>Editor images</td></tr>
<tr><td>No directory listing</td><td>Do not expose uploads or backups</td></tr>
<tr><td>Reasonable CSP</td><td>Scripts only from your origin</td></tr>
<tr><td>CORS only if the front is on another domain</td><td>Otherwise unused</td></tr>
</tbody></table>
<p>After updating JS/CSS, hard-refresh or suffix <code>?v=0.1.2</code>.</p>
<footer class="page-foot"><a href="php.html">Wire upload + AI in PHP</a></footer>`],
    php: ["PHP", `<p class="kicker">Frameworks</p>
<h1>PHP</h1>
<p class="lead">Use the kit <code>ready/ora-editor/</code> first (already compiled). Commented sources stay in <code>Docs/exemples/</code>.</p>
<h2>Files</h2>
<table><thead><tr><th>File</th><th>Role</th></tr></thead><tbody>
<tr><td><a href="../exemples/page.html">page.html</a></td><td>Demo page</td></tr>
<tr><td><a href="../exemples/upload.php">upload.php</a></td><td>Receives <code>file</code>, writes <code>uploads/</code>, returns <code>{ url, alt }</code></td></tr>
<tr><td><a href="../exemples/ai-proxy.php">ai-proxy.php</a></td><td>Receives <code>{ op, scope, fragments }</code>, calls OpenAI, returns <code>{ patches }</code></td></tr>
<tr><td><a href="../exemples/config.sample.php">config.sample.php</a></td><td>Secrets template — copy <em>outside</em> the web root</td></tr>
</tbody></table>
<h2>Upload</h2>
<p>Expected JSON:</p>
${pre(SNIPPETS.uploadJson)}
<div class="warn">Add your own auth (session, token). As-is, anyone who knows the URL can upload.</div>
<h2>Save content</h2>
<p>Prefer storing <strong>JSON</strong> from <code>editor.getJSON()</code>. <code>getHTML()</code> is a sanitized export.</p>
<footer class="page-foot">Laravel project? Use the dedicated package — <a href="laravel.html">next page</a>.</footer>`],
    laravel: ["Laravel", `<p class="kicker">Frameworks</p>
<h1>Laravel</h1>
<p class="lead">Simplest path: copy <code>ready/ora-editor/</code> to <code>public/ora-editor/</code>. The <code>ora/laravel</code> package is optional (Blade, controllers).</p>
<h2>Install</h2>
${pre(`composer config repositories.ora-laravel path ../OraEditor/packages/laravel
composer require ora/laravel
php artisan vendor:publish --tag=ora-assets
php artisan vendor:publish --tag=ora-views`)}
<h2>Blade</h2>
${pre(`<x-ora::editor :content="$doc" preset="full" wire-model="body" />`)}
<h2>OpenAI key</h2>
<p>In <code>.env</code> (never committed, never sent to the browser): <code>OPENAI_API_KEY=sk-...</code></p>
<div class="note">In production, parse the model message and return strictly <code>{ "patches": [{ "path", "text" }] }</code>. See <a href="ia.html">AI</a>.</div>
<p>The browser must not write <code>public/vendor/ora-editor</code>. See <a href="update-manager.html">Update Manager</a>.</p>
<footer class="page-foot"><a href="wordpress.html">And on WordPress?</a></footer>`],
    wordpress: ["WordPress", `<p class="kicker">Frameworks</p>
<h1>WordPress</h1>
<p class="lead">Yes, you can install it on WordPress. There is <strong>no official plugin</strong> on wordpress.org yet. Ship the Core as assets of a small plugin: shortcode, settings (AI key), REST routes for upload and proxy.</p>
<div class="warn">OraEditor does not replace Gutenberg in one click. Realistic uses: <strong>front form / page</strong> (shortcode) or a <strong>metabox</strong> (JSON in post meta).</div>
<h2>Manual install</h2>
<ol class="steps">
  <li>Create <code>wp-content/plugins/ora-editor/</code>.</li>
  <li>Copy <a href="../exemples/wordpress-plugin/ora-editor.php">ora-editor.php</a>.</li>
  <li>Copy <code>ora-editor.js</code> + <code>.css</code> from <code>ready/ora-editor/</code> into <code>assets/</code> (already built, no npm).</li>
  <li>Activate the plugin. Settings → OraEditor: paste the OpenAI key (never printed in public HTML).</li>
</ol>
<h2>Shortcode</h2>
${pre(`[ora_editor id="my-editor" preset="full"]`)}
<footer class="page-foot">Skeleton plugin: <code>Docs/exemples/wordpress-plugin/ora-editor.php</code></footer>`],
    ia: ["AI keys & providers", `<p class="kicker">Operations</p>
<h1>Artificial intelligence</h1>
<p class="lead">AI transforms the Document Model (text fragments + paths), never a raw HTML blob. The browser may only know a proxy URL. The key stays on the server.</p>
<div class="danger"><strong>Golden rule.</strong> Never put <code>sk-…</code> in <code>ora-editor.js</code>, an HTML attribute, or a public Git repo.</div>
<h2>Providers</h2>
<table><thead><tr><th>Provider</th><th>Status</th><th>How</th></tr></thead><tbody>
<tr><td><strong>Mock</strong></td><td>On by default</td><td>No key. Local demo.</td></tr>
<tr><td><strong>OraAI</strong></td><td>Greyed out</td><td>Not available yet.</td></tr>
<tr><td><strong>OpenAI / custom</strong></td><td>Via proxy</td><td><code>aiProxyUrl: "/ora-editor/ai"</code> + server key</td></tr>
<tr><td><strong>Ollama</strong></td><td>Local</td><td><code>createOllamaEngine()</code> + <code>createLocalProvider()</code></td></tr>
</tbody></table>
<h2>Request / response</h2>
${pre(SNIPPETS.aiReq)}
${pre(SNIPPETS.aiRes)}
<div class="warn">If the JSON has no <code>patches</code> array, the Core throws “invalid response”. Do not forward the raw ChatGPT payload.</div>
<footer class="page-foot">PHP example: <a href="../exemples/ai-proxy.php">exemples/ai-proxy.php</a></footer>`],
    "update-manager": ["Update Manager", `<p class="kicker">Operations</p>
<h1>Update Manager</h1>
<p class="lead">A <strong>host tool</strong>: <code>packages/update-manager</code> / <code>@ora-editor/update-manager</code>. No screen in the editor, no dashboard, no shipped “Update” button.</p>
<div class="note">The browser cannot overwrite <code>public/ora-editor/ora-editor.js</code>. Updates go through SSH, cron, Artisan, CI, or manual FTP.</div>
<h2>Pipeline</h2>
<ol class="steps">
  <li><strong>CHECK</strong> — download the remote manifest.</li>
  <li><strong>COMPAT</strong> — compare versions.</li>
  <li><strong>BACKUP</strong> — copy current assets.</li>
  <li><strong>DOWNLOAD</strong> — fetch the archive.</li>
  <li><strong>VERIFY</strong> — SHA-256 matches.</li>
  <li><strong>INSTALL</strong> — extract to destination.</li>
  <li><strong>HEALTHCHECK</strong> — your callback.</li>
  <li><strong>SUCCESS</strong> or <strong>ROLLBACK</strong>.</li>
</ol>
<div class="danger">Never expose <code>apply</code> on an anonymous URL.</div>
<p>Ready script: <a href="../exemples/update.mjs">exemples/update.mjs</a></p>
<footer class="page-foot">Shared hosting without Node: update JS/CSS by hand.</footer>`],
    api: ["Host API", `<p class="kicker">Start</p>
<h1>Public host API</h1>
<p class="lead">Short reference to wire OraEditor. TypeScript details also live in <code>docs/api.md</code>.</p>
<h2>Constructor</h2>
${pre(`const editor = new OraEditor({
  element: "#editor",
  content: "<p>Hello</p>",
  toolbar: true,
  preset: "full",
  locale: document.documentElement.lang || "en",
  uploadImage: async (file, ctx) => ({ url, alt }),
  aiProxyUrl: "/ora-editor/ai",
});`)}
<h2>Useful methods</h2>
<p><code>getJSON</code> / <code>setJSON</code>, <code>getHTML</code> / <code>setHTML</code>, <code>setLocale</code>, <code>getStats</code>, <code>openFindBar</code>, <code>runAI</code>, <code>exec</code>, <code>undo</code> / <code>redo</code>, <code>destroy</code>.</p>
<p>Events: <code>ready</code>, <code>change</code>, <code>imageUpload*</code>, <code>aiRequest*</code>.</p>
<p>Locales: <code>fr</code>, <code>en</code>, <code>ru</code>, <code>pt</code>, <code>es</code>, <code>it</code>, <code>de</code>.</p>
<footer class="page-foot"><a href="faq.html">FAQ</a></footer>`],
    faq: ["FAQ", `<p class="kicker">Operations</p>
<h1>FAQ</h1>
<h2>Is there an admin dashboard?</h2>
<p><strong>No.</strong> OraEditor is not a CMS. Playground: <code>npm run dev</code>. AI panel: under the Full editor. Update Manager: wire it into <em>your</em> back office.</p>
<h2>Where is the Update Manager?</h2>
<p><code>packages/update-manager</code> — not visible in the browser. See <a href="update-manager.html">this page</a>.</p>
<h2>How do I enable the AIs?</h2>
<p>Preset <code>full</code> + <code>aiProxyUrl</code>. Mock is already there. OraAI is greyed out. Ollama via <code>createOllamaEngine</code>. Details: <a href="ia.html">AI keys</a>.</p>
<h2>Images disappear on reload</h2>
<p>You are still on the <code>blob:</code> fallback. Wire <code>uploadImage</code>.</p>
<h2>AI says “invalid response”</h2>
<p>Reformat the proxy output to <code>{ patches: [{ path, text }] }</code>.</p>
<h2>Offline?</h2>
<p>Yes for editing (local JS/CSS, mock AI). No for OpenAI. Ollama can run locally.</p>
<footer class="page-foot"><a href="index.html">Home</a> · <a href="../index.html">Languages</a></footer>`],
  },
};

const MORE = {
  pt: label("pt", {
    home: "Início",
    install: "Instalação geral",
    lead: "O OraEditor é um editor rico autónomo: um ficheiro JavaScript e uma folha CSS. Não depende de nenhum framework. O <em>seu</em> projeto fornece a página, o upload, o proxy de IA e as atualizações.",
    notCms: "Não é um CMS. Não há dashboard de administração incluído.",
    neverKey: "As chaves OpenAI nunca vão no JS público.",
    gold: "Regra de ouro. Nunca coloque <code>sk-…</code> no cliente.",
    noDash: "<strong>Não.</strong> O OraEditor não é um CMS.",
  }),
  es: label("es", {
    home: "Inicio",
    install: "Instalación general",
    lead: "OraEditor es un editor rico autónomo: un archivo JavaScript y una hoja CSS. No depende de ningún framework. <em>Su</em> proyecto aporta la página, la subida, el proxy de IA y las actualizaciones.",
    notCms: "No es un CMS. No incluye un panel de administración.",
    neverKey: "Las claves OpenAI nunca van en el JS público.",
    gold: "Regla de oro. Nunca ponga <code>sk-…</code> en el cliente.",
    noDash: "<strong>No.</strong> OraEditor no es un CMS.",
  }),
  it: label("it", {
    home: "Home",
    install: "Installazione generale",
    lead: "OraEditor è un editor ricco autonomo: un file JavaScript e un foglio CSS. Non dipende da alcun framework. Il <em>vostro</em> progetto fornisce pagina, upload, proxy IA e aggiornamenti.",
    notCms: "Non è un CMS. Nessuna dashboard admin è inclusa.",
    neverKey: "Le chiavi OpenAI non vanno mai nel JS pubblico.",
    gold: "Regola d’oro. Non mettere mai <code>sk-…</code> nel client.",
    noDash: "<strong>No.</strong> OraEditor non è un CMS.",
  }),
  ru: label("ru", {
    home: "Главная",
    install: "Общая установка",
    lead: "OraEditor — автономный визуальный редактор: один файл JavaScript и одна таблица стилей. Он не зависит от фреймворков. <em>Ваш</em> проект даёт страницу, загрузку файлов, прокси ИИ и обновления.",
    notCms: "Это не CMS. Админ-панель не поставляется.",
    neverKey: "Ключи OpenAI никогда не должны быть в публичном JS.",
    gold: "Золотое правило. Никогда не кладите <code>sk-…</code> в клиент.",
    noDash: "<strong>Нет.</strong> OraEditor — не CMS.",
  }),
  de: label("de", {
    home: "Startseite",
    install: "Allgemeine Installation",
    lead: "OraEditor ist ein eigenständiger Rich-Editor: eine JavaScript-Datei und ein Stylesheet. Kein Framework nötig. <em>Ihr</em> Projekt liefert Seite, Upload, KI-Proxy und Updates.",
    notCms: "Es ist kein CMS. Es gibt kein mitgeliefertes Admin-Dashboard.",
    neverKey: "OpenAI-Schlüssel gehören niemals ins öffentliche JS.",
    gold: "Goldene Regel. Legen Sie <code>sk-…</code> niemals in den Client.",
    noDash: "<strong>Nein.</strong> OraEditor ist kein CMS.",
  }),
};

function label(lang, s) {
  const host = { pt: "Alojamento", es: "Alojamiento", it: "Hosting", ru: "Хостинг", de: "Hosting" }[lang];
  const ops = { pt: "Operação", es: "Explotación", it: "Esercizio", ru: "Эксплуатация", de: "Betrieb" }[lang];
  const start = { pt: "Começar", es: "Empezar", it: "Inizio", ru: "Старт", de: "Start" }[lang];
  const fw = "PHP / Laravel / WordPress";
  return {
    index: [s.home, `<p class="kicker">${start}</p>
<h1>OraEditor</h1>
<p class="lead">${s.lead}</p>
<div class="cards">
  <a class="card" href="installation.html"><h3>1. ${s.install}</h3><p>ready/ora-editor/</p></a>
  <a class="card" href="cpanel.html"><h3>2. cPanel / Webuzo / ${host}</h3><p>public_html · Apache · Nginx</p></a>
  <a class="card" href="php.html"><h3>3. ${fw}</h3><p>upload + proxy IA</p></a>
  <a class="card" href="ia.html"><h3>4. IA</h3><p>OpenAI · Ollama · mock · OraAI</p></a>
  <a class="card" href="update-manager.html"><h3>5. Update Manager</h3><p>CHECK → INSTALL → HEALTHCHECK</p></a>
</div>
<ul><li>${s.notCms}</li><li>${s.neverKey}</li></ul>
<p><a href="installation.html">${s.install}</a> · <a href="faq.html">FAQ</a> · <a href="../index.html">FR EN PO ES IT RU DE</a></p>`],
    installation: [s.install, `<p class="kicker">${start}</p><h1>${s.install}</h1>
<p class="lead">${s.lead}</p>
<div class="ok"><code>ready/ora-editor/</code></div>
<p>public_html/ora-editor/ → editeur.html</p>
<h2>2. HTML</h2>
${pre(SNIPPETS.htmlInit)}
<h2>3. npm import</h2>
${pre(SNIPPETS.npmImport)}
<h2>4. Adapters</h2>
<p><code>uploadImage</code> · <code>openMediaLibrary</code> · <code>aiProxyUrl</code></p>
<div class="warn">blob: fallback — <a href="../exemples/upload.php">upload.php</a></div>
<ul>
  <li><a href="../exemples/page.html">page.html</a></li>
  <li><a href="../exemples/upload.php">upload.php</a></li>
  <li><a href="../exemples/ai-proxy.php">ai-proxy.php</a></li>
  <li><a href="../exemples/config.sample.php">config.sample.php</a></li>
  <li><a href="../exemples/update.mjs">update.mjs</a></li>
</ul>
<footer class="page-foot"><a href="cpanel.html">cPanel</a> · <a href="webuzo.html">Webuzo</a></footer>`],
    cpanel: ["cPanel", `<p class="kicker">${host}</p><h1>cPanel</h1>
<p class="lead"><code>ready/ora-editor/</code> → public_html</p>
<ol class="steps">
  <li>File Manager → public_html</li>
  <li>ready/ora-editor/</li>
  <li>/ora-editor/editeur.html</li>
</ol>
<p>config.php · sk-REMPLACER</p>
<footer class="page-foot"><a href="php.html">PHP</a> · <a href="ia.html">IA</a></footer>`],
    webuzo: ["Webuzo", `<p class="kicker">${host}</p><h1>Webuzo</h1>
<p>ready/ora-editor/ → public_html → editeur.html</p>
<footer class="page-foot"><a href="serveur-web.html">Apache / Nginx</a></footer>`],
    "serveur-web": ["Apache, Nginx, IIS", `<p class="kicker">${host}</p><h1>Apache, Nginx, IIS</h1>
${pre(SNIPPETS.tree)}
<table><thead><tr><th>HTTPS</th><th>upload</th><th>CSP</th><th>CORS</th></tr></thead>
<tbody><tr><td>oui</td><td>client_max_body_size</td><td>'self'</td><td>si besoin</td></tr></tbody></table>
<footer class="page-foot"><a href="php.html">PHP</a></footer>`],
    php: ["PHP", `<p class="kicker">${fw}</p><h1>PHP</h1>
<p><code>ready/ora-editor/</code></p>
<p><a href="../exemples/page.html">page.html</a> · upload.php · ai-proxy.php</p>
<tr><td><a href="../exemples/page.html">page.html</a></td><td>demo</td></tr>
<tr><td><a href="../exemples/upload.php">upload.php</a></td><td>{ url, alt }</td></tr>
<tr><td><a href="../exemples/ai-proxy.php">ai-proxy.php</a></td><td>{ patches }</td></tr>
<tr><td><a href="../exemples/config.sample.php">config.sample.php</a></td><td>hors web</td></tr>
</tbody></table>
${pre(SNIPPETS.uploadJson)}
<div class="warn">auth / CSRF</div>
<p>getJSON() &gt; getHTML()</p>
<footer class="page-foot"><a href="laravel.html">Laravel</a></footer>`],
    laravel: ["Laravel", `<p class="kicker">${fw}</p><h1>Laravel</h1>
${pre("composer config repositories.ora-laravel path ../OraEditor/packages/laravel\ncomposer require ora/laravel\nphp artisan vendor:publish --tag=ora-assets")}
${pre('<x-ora::editor :content="$doc" preset="full" wire-model="body" />')}
<p><code>OPENAI_API_KEY</code> → .env — ${s.neverKey}</p>
<div class="note">{ "patches": [{ "path", "text" }] }</div>
<footer class="page-foot"><a href="wordpress.html">WordPress</a></footer>`],
    wordpress: ["WordPress", `<p class="kicker">${fw}</p><h1>WordPress</h1>
<p>JS/CSS depuis <code>ready/ora-editor/</code> + <a href="../exemples/wordpress-plugin/ora-editor.php">ora-editor.php</a></p>
${pre('[ora_editor id="editor" preset="full"]')}
<p>REST: /wp-json/ora-editor/v1/upload · /ai</p>
<footer class="page-foot"><a href="update-manager.html">Update Manager</a></footer>`],
    ia: ["IA", `<p class="kicker">${ops}</p><h1>IA</h1>
<div class="danger">${s.gold}</div>
<table><thead><tr><th>Mock</th><th>OraAI</th><th>OpenAI</th><th>Ollama</th></tr></thead>
<tbody><tr><td>oui</td><td>—</td><td>aiProxyUrl</td><td>createOllamaEngine</td></tr></tbody></table>
${pre(SNIPPETS.aiReq)}${pre(SNIPPETS.aiRes)}
<footer class="page-foot"><a href="../exemples/ai-proxy.php">ai-proxy.php</a></footer>`],
    "update-manager": ["Update Manager", `<p class="kicker">${ops}</p><h1>Update Manager</h1>
<p><code>@ora-editor/update-manager</code></p>
<ol class="steps"><li>CHECK</li><li>COMPAT</li><li>BACKUP</li><li>DOWNLOAD</li><li>VERIFY</li><li>INSTALL</li><li>HEALTHCHECK</li><li>SUCCESS / ROLLBACK</li></ol>
<p><a href="../exemples/update.mjs">update.mjs</a></p>
<div class="danger">${s.neverKey}</div>`],
    api: ["API", `<p class="kicker">${start}</p><h1>API</h1>
${pre("new OraEditor({ element: '#editor', toolbar: true, preset: 'full', locale: document.documentElement.lang, aiProxyUrl: '/ora-editor/ai' })")}
<p>getJSON · setJSON · getHTML · setLocale · getStats · openFindBar · runAI · exec · undo · destroy</p>
<p>ready · change · imageUpload* · aiRequest*</p>
<footer class="page-foot"><a href="faq.html">FAQ</a></footer>`],
    faq: ["FAQ", `<p class="kicker">${ops}</p><h1>FAQ</h1>
<p>${s.noDash}</p>
<p>Update Manager: <code>packages/update-manager</code> — <a href="update-manager.html">*</a></p>
<p>IA: <code>full</code> + <code>aiProxyUrl</code> — <a href="ia.html">*</a></p>
<p>blob: → uploadImage</p>
<p>{ patches: [{ path, text }] }</p>
<footer class="page-foot"><a href="index.html">${s.home}</a> · <a href="../index.html">FR EN PO ES IT RU DE</a></footer>`],
  };
}

async function main() {
  const root = new URL("../Docs", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  const docs = join(process.cwd(), "Docs");

  for (const [lang, pages] of Object.entries({ en: T.en, ...Object.fromEntries(Object.entries(MORE)) })) {
    const dir = join(docs, lang);
    await mkdir(dir, { recursive: true });
    for (const key of PAGES) {
      const entry = pages[key];
      if (!entry) throw new Error(`Missing ${lang}/${key}`);
      const [title, inner] = entry;
      await writeFile(join(dir, `${key}.html`), wrap(lang, key, title, inner), "utf8");
    }
    console.log("wrote", lang);
  }

  const po = join(docs, "po");
  await mkdir(po, { recursive: true });
  for (const key of PAGES) {
    const html = await (await import("node:fs/promises")).readFile(join(docs, "pt", `${key}.html`), "utf8");
    await writeFile(join(po, `${key}.html`), html.replaceAll('data-lang="pt"', 'data-lang="pt"'), "utf8");
  }
  console.log("wrote po (alias pt)");
}

await main();
