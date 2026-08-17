export function showLinkPopover(
  host: HTMLElement,
  anchor: HTMLElement,
  options: {
    href: string;
    onOpen: () => void;
    onEdit: () => void;
    onRemove: () => void;
  },
): () => void {
  closeLinkPopover(host);
  const pop = document.createElement("div");
  pop.className = "ora-link-popover";
  pop.setAttribute("role", "dialog");
  pop.innerHTML = `
    <a class="ora-link-popover-url" href="${escapeAttr(options.href)}" target="_blank" rel="noopener noreferrer">${escapeText(options.href)}</a>
    <button type="button" data-open>Ouvrir</button>
    <button type="button" data-edit>Modifier</button>
    <button type="button" data-remove>Retirer</button>
  `;
  const hostRect = host.getBoundingClientRect();
  const linkRect = anchor.getBoundingClientRect();
  pop.style.left = `${Math.max(8, linkRect.left - hostRect.left)}px`;
  pop.style.top = `${linkRect.bottom - hostRect.top + 6}px`;
  host.appendChild(pop);
  const popRect = pop.getBoundingClientRect();
  if (popRect.right > hostRect.right - 8) {
    pop.style.left = `${Math.max(8, hostRect.width - popRect.width - 8)}px`;
  }

  const close = () => {
    pop.remove();
    document.removeEventListener("mousedown", onDoc, true);
  };
  const onDoc = (event: MouseEvent) => {
    const target = event.target as Node | null;
    if (target && (pop.contains(target) || anchor.contains(target))) {
      return;
    }
    close();
  };
  pop.querySelector("[data-open]")?.addEventListener("click", (event) => {
    event.preventDefault();
    options.onOpen();
    close();
  });
  pop.querySelector("[data-edit]")?.addEventListener("click", (event) => {
    event.preventDefault();
    close();
    options.onEdit();
  });
  pop.querySelector("[data-remove]")?.addEventListener("click", (event) => {
    event.preventDefault();
    options.onRemove();
    close();
  });
  pop.querySelector(".ora-link-popover-url")?.addEventListener("click", (event) => {
    event.preventDefault();
    options.onOpen();
    close();
  });
  document.addEventListener("mousedown", onDoc, true);
  return close;
}

export function closeLinkPopover(host: HTMLElement): void {
  host.querySelectorAll(".ora-link-popover").forEach((el) => el.remove());
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
