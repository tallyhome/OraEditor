export interface MentionItem {
  id: string;
  label: string;
}

export function showMentionMenu(
  host: HTMLElement,
  items: MentionItem[],
  onPick: (item: MentionItem) => void,
): HTMLElement {
  hideMentionMenu(host);
  const menu = document.createElement("div");
  menu.className = "ora-mention-menu";
  menu.setAttribute("role", "listbox");
  items.slice(0, 12).forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "option");
    button.textContent = `@${item.label}`;
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      onPick(item);
      hideMentionMenu(host);
    });
    menu.appendChild(button);
  });
  host.appendChild(menu);
  return menu;
}

export function hideMentionMenu(host: HTMLElement): void {
  host.querySelector(".ora-mention-menu")?.remove();
}
