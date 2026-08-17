export interface LinkDialogResult {
  href: string;
  target?: "_blank";
  rel?: string[];
}

export function openLinkDialog(
  host: HTMLElement,
  initial?: { href?: string; target?: string },
): Promise<LinkDialogResult | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "ora-dialog-overlay";
    overlay.innerHTML = `
      <form class="ora-dialog" role="dialog" aria-labelledby="ora-link-title">
        <h2 id="ora-link-title">Lien</h2>
        <label>
          URL
          <input name="href" type="url" required placeholder="https://" value="${escapeAttr(initial?.href ?? "")}">
        </label>
        <label class="ora-dialog-check">
          <input name="blank" type="checkbox" ${initial?.target === "_blank" ? "checked" : ""}>
          Ouvrir dans un nouvel onglet
        </label>
        <div class="ora-dialog-actions">
          <button type="button" data-cancel>Annuler</button>
          <button type="submit">Appliquer</button>
        </div>
      </form>
    `;
    const form = overlay.querySelector("form") as HTMLFormElement;
    const hrefInput = form.querySelector<HTMLInputElement>('input[name="href"]');
    const cancel = () => {
      overlay.remove();
      resolve(null);
    };
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        cancel();
      }
    });
    form.querySelector("[data-cancel]")?.addEventListener("click", cancel);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const href = hrefInput?.value.trim() ?? "";
      if (!href) {
        cancel();
        return;
      }
      const blank = form.querySelector<HTMLInputElement>('input[name="blank"]')?.checked === true;
      overlay.remove();
      resolve({
        href,
        ...(blank ? { target: "_blank" as const, rel: ["noopener", "noreferrer"] } : {}),
      });
    });
    host.appendChild(overlay);
    hrefInput?.focus();
    hrefInput?.select();
  });
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
