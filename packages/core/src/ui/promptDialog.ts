export function openPromptDialog(
  host: HTMLElement,
  title: string,
  fields: Array<{ name: string; label: string; type?: string; value?: string; placeholder?: string }>,
): Promise<Record<string, string> | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "ora-dialog-overlay";
    const inputs = fields
      .map(
        (field) => `
        <label>
          ${escapeText(field.label)}
          <input name="${escapeAttr(field.name)}" type="${field.type ?? "text"}" value="${escapeAttr(field.value ?? "")}" placeholder="${escapeAttr(field.placeholder ?? "")}">
        </label>`,
      )
      .join("");
    overlay.innerHTML = `
      <form class="ora-dialog" role="dialog">
        <h2>${escapeText(title)}</h2>
        ${inputs}
        <div class="ora-dialog-actions">
          <button type="button" data-cancel>Annuler</button>
          <button type="submit">Appliquer</button>
        </div>
      </form>
    `;
    const form = overlay.querySelector("form") as HTMLFormElement;
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
      const data: Record<string, string> = {};
      fields.forEach((field) => {
        data[field.name] = form.querySelector<HTMLInputElement>(`[name="${field.name}"]`)?.value.trim() ?? "";
      });
      overlay.remove();
      resolve(data);
    });
    host.appendChild(overlay);
    form.querySelector("input")?.focus();
  });
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}
