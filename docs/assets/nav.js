(function () {
  const LANGS = [
    { id: "fr", label: "FR", name: "Français" },
    { id: "en", label: "EN", name: "English" },
    { id: "pt", label: "PO", name: "Português" },
    { id: "es", label: "ES", name: "Español" },
    { id: "it", label: "IT", name: "Italiano" },
    { id: "ru", label: "RU", name: "Русский" },
    { id: "de", label: "DE", name: "Deutsch" },
  ];

  const I18N = {
    fr: {
      brand: "Documentation d’intégration",
      menu: "Menu",
      groups: [
        { title: "Démarrer", items: [
          { href: "index.html", label: "Accueil" },
          { href: "installation.html", label: "Installation générale" },
          { href: "api.html", label: "API hôte" },
        ]},
        { title: "Hébergement", items: [
          { href: "cpanel.html", label: "cPanel" },
          { href: "webuzo.html", label: "Webuzo" },
          { href: "serveur-web.html", label: "Apache, Nginx, IIS…" },
        ]},
        { title: "Frameworks", items: [
          { href: "php.html", label: "PHP" },
          { href: "laravel.html", label: "Laravel" },
          { href: "wordpress.html", label: "WordPress" },
        ]},
        { title: "Exploitation", items: [
          { href: "ia.html", label: "Clés et providers IA" },
          { href: "update-manager.html", label: "Update Manager" },
          { href: "faq.html", label: "FAQ" },
        ]},
      ],
    },
    en: {
      brand: "Integration documentation",
      menu: "Menu",
      groups: [
        { title: "Start", items: [
          { href: "index.html", label: "Home" },
          { href: "installation.html", label: "General installation" },
          { href: "api.html", label: "Host API" },
        ]},
        { title: "Hosting", items: [
          { href: "cpanel.html", label: "cPanel" },
          { href: "webuzo.html", label: "Webuzo" },
          { href: "serveur-web.html", label: "Apache, Nginx, IIS…" },
        ]},
        { title: "Frameworks", items: [
          { href: "php.html", label: "PHP" },
          { href: "laravel.html", label: "Laravel" },
          { href: "wordpress.html", label: "WordPress" },
        ]},
        { title: "Operations", items: [
          { href: "ia.html", label: "AI keys & providers" },
          { href: "update-manager.html", label: "Update Manager" },
          { href: "faq.html", label: "FAQ" },
        ]},
      ],
    },
    pt: {
      brand: "Documentação de integração",
      menu: "Menu",
      groups: [
        { title: "Começar", items: [
          { href: "index.html", label: "Início" },
          { href: "installation.html", label: "Instalação geral" },
          { href: "api.html", label: "API do host" },
        ]},
        { title: "Alojamento", items: [
          { href: "cpanel.html", label: "cPanel" },
          { href: "webuzo.html", label: "Webuzo" },
          { href: "serveur-web.html", label: "Apache, Nginx, IIS…" },
        ]},
        { title: "Frameworks", items: [
          { href: "php.html", label: "PHP" },
          { href: "laravel.html", label: "Laravel" },
          { href: "wordpress.html", label: "WordPress" },
        ]},
        { title: "Operação", items: [
          { href: "ia.html", label: "Chaves e providers de IA" },
          { href: "update-manager.html", label: "Update Manager" },
          { href: "faq.html", label: "FAQ" },
        ]},
      ],
    },
    es: {
      brand: "Documentación de integración",
      menu: "Menú",
      groups: [
        { title: "Empezar", items: [
          { href: "index.html", label: "Inicio" },
          { href: "installation.html", label: "Instalación general" },
          { href: "api.html", label: "API del host" },
        ]},
        { title: "Alojamiento", items: [
          { href: "cpanel.html", label: "cPanel" },
          { href: "webuzo.html", label: "Webuzo" },
          { href: "serveur-web.html", label: "Apache, Nginx, IIS…" },
        ]},
        { title: "Frameworks", items: [
          { href: "php.html", label: "PHP" },
          { href: "laravel.html", label: "Laravel" },
          { href: "wordpress.html", label: "WordPress" },
        ]},
        { title: "Explotación", items: [
          { href: "ia.html", label: "Claves y proveedores IA" },
          { href: "update-manager.html", label: "Update Manager" },
          { href: "faq.html", label: "FAQ" },
        ]},
      ],
    },
    it: {
      brand: "Documentazione di integrazione",
      menu: "Menu",
      groups: [
        { title: "Inizio", items: [
          { href: "index.html", label: "Home" },
          { href: "installation.html", label: "Installazione generale" },
          { href: "api.html", label: "API host" },
        ]},
        { title: "Hosting", items: [
          { href: "cpanel.html", label: "cPanel" },
          { href: "webuzo.html", label: "Webuzo" },
          { href: "serveur-web.html", label: "Apache, Nginx, IIS…" },
        ]},
        { title: "Framework", items: [
          { href: "php.html", label: "PHP" },
          { href: "laravel.html", label: "Laravel" },
          { href: "wordpress.html", label: "WordPress" },
        ]},
        { title: "Esercizio", items: [
          { href: "ia.html", label: "Chiavi e provider IA" },
          { href: "update-manager.html", label: "Update Manager" },
          { href: "faq.html", label: "FAQ" },
        ]},
      ],
    },
    ru: {
      brand: "Документация по интеграции",
      menu: "Меню",
      groups: [
        { title: "Старт", items: [
          { href: "index.html", label: "Главная" },
          { href: "installation.html", label: "Общая установка" },
          { href: "api.html", label: "API хоста" },
        ]},
        { title: "Хостинг", items: [
          { href: "cpanel.html", label: "cPanel" },
          { href: "webuzo.html", label: "Webuzo" },
          { href: "serveur-web.html", label: "Apache, Nginx, IIS…" },
        ]},
        { title: "Фреймворки", items: [
          { href: "php.html", label: "PHP" },
          { href: "laravel.html", label: "Laravel" },
          { href: "wordpress.html", label: "WordPress" },
        ]},
        { title: "Эксплуатация", items: [
          { href: "ia.html", label: "Ключи и провайдеры ИИ" },
          { href: "update-manager.html", label: "Update Manager" },
          { href: "faq.html", label: "FAQ" },
        ]},
      ],
    },
    de: {
      brand: "Integrationsdokumentation",
      menu: "Menü",
      groups: [
        { title: "Start", items: [
          { href: "index.html", label: "Startseite" },
          { href: "installation.html", label: "Allgemeine Installation" },
          { href: "api.html", label: "Host-API" },
        ]},
        { title: "Hosting", items: [
          { href: "cpanel.html", label: "cPanel" },
          { href: "webuzo.html", label: "Webuzo" },
          { href: "serveur-web.html", label: "Apache, Nginx, IIS…" },
        ]},
        { title: "Frameworks", items: [
          { href: "php.html", label: "PHP" },
          { href: "laravel.html", label: "Laravel" },
          { href: "wordpress.html", label: "WordPress" },
        ]},
        { title: "Betrieb", items: [
          { href: "ia.html", label: "KI-Schlüssel & Provider" },
          { href: "update-manager.html", label: "Update Manager" },
          { href: "faq.html", label: "FAQ" },
        ]},
      ],
    },
  };

  const lang = document.body.getAttribute("data-lang") || "fr";
  const page = (document.body.getAttribute("data-page") || "index.html").replace(/^\.\//, "");
  const pack = I18N[lang] || I18N.fr;
  const aside = document.getElementById("sidebar");
  if (!aside) return;

  const brand = document.createElement("a");
  brand.className = "brand";
  brand.href = "index.html";
  brand.innerHTML = "<strong>OraEditor</strong><span>" + pack.brand + "</span>";
  aside.appendChild(brand);

  for (const group of pack.groups) {
    const title = document.createElement("div");
    title.className = "nav-group";
    title.textContent = group.title;
    aside.appendChild(title);
    for (const item of group.items) {
      const a = document.createElement("a");
      a.className = "nav-link" + (item.href === page ? " is-active" : "");
      a.href = item.href;
      a.textContent = item.label;
      aside.appendChild(a);
    }
  }

  const langs = document.createElement("div");
  langs.className = "langs";
  langs.setAttribute("aria-label", "Language");
  for (const item of LANGS) {
    const a = document.createElement("a");
    a.href = "../" + item.id + "/" + page;
    a.title = item.name;
    a.textContent = item.label;
    if (item.id === lang) a.className = "is-active";
    langs.appendChild(a);
  }
  const home = document.createElement("a");
  home.href = "../index.html";
  home.title = "Languages";
  home.textContent = "•••";
  langs.appendChild(home);
  aside.appendChild(langs);

  const btn = document.createElement("button");
  btn.className = "menu-btn";
  btn.type = "button";
  btn.textContent = pack.menu;
  btn.addEventListener("click", function () {
    document.body.classList.toggle("nav-open");
  });
  document.body.prepend(btn);
})();
