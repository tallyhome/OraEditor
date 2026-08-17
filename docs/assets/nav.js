(function () {
  const groups = [
    {
      title: "Démarrer",
      items: [
        { href: "index.html", label: "Accueil" },
        { href: "installation.html", label: "Installation générale" },
        { href: "api.html", label: "API hôte" },
      ],
    },
    {
      title: "Hébergement",
      items: [
        { href: "cpanel.html", label: "cPanel" },
        { href: "webuzo.html", label: "Webuzo" },
        { href: "serveur-web.html", label: "Apache, Nginx, IIS…" },
      ],
    },
    {
      title: "Frameworks",
      items: [
        { href: "php.html", label: "PHP" },
        { href: "laravel.html", label: "Laravel" },
        { href: "wordpress.html", label: "WordPress" },
      ],
    },
    {
      title: "Exploitation",
      items: [
        { href: "ia.html", label: "Clés et providers IA" },
        { href: "update-manager.html", label: "Update Manager" },
        { href: "faq.html", label: "FAQ" },
      ],
    },
  ];

  const page = (document.body.getAttribute("data-page") || "").replace(/^\.\//, "");
  const aside = document.getElementById("sidebar");
  if (!aside) return;

  const brand = document.createElement("a");
  brand.className = "brand";
  brand.href = "index.html";
  brand.innerHTML = "<strong>OraEditor</strong><span>Documentation d’intégration</span>";
  aside.appendChild(brand);

  for (const group of groups) {
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

  const btn = document.createElement("button");
  btn.className = "menu-btn";
  btn.type = "button";
  btn.textContent = "Menu";
  btn.addEventListener("click", function () {
    document.body.classList.toggle("nav-open");
  });
  document.body.prepend(btn);
})();
