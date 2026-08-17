import { describe, expect, it } from "vitest";
import { OraEditor } from "./OraEditor.js";

function mount(): HTMLElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
}

describe("API OraEditor", () => {
  it("getJSON / setJSON / getHTML / setHTML", () => {
    const host = mount();
    const editor = new OraEditor({ element: host });
    editor.setHTML("<h2>Titre</h2><p>Hello <strong>monde</strong></p>");
    expect(editor.getHTML()).toContain("<h2>Titre</h2>");
    const json = editor.getJSON();
    expect(json.content[0]?.type).toBe("heading");
    editor.setJSON({ version: 1, type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "" }] }] });
    expect(editor.getJSON().content).toHaveLength(1);
    editor.destroy();
  });

  it("undo / redo après insertText", () => {
    const host = mount();
    const editor = new OraEditor({ element: host });
    editor.exec("insertText", { text: "Abc" });
    expect(editor.getHTML()).toContain("Abc");
    editor.undo();
    expect(editor.getHTML()).not.toContain("Abc");
    editor.redo();
    expect(editor.getHTML()).toContain("Abc");
    editor.destroy();
  });

  it("toggleMark et setBlock", () => {
    const host = mount();
    const editor = new OraEditor({ element: host });
    editor.exec("insertText", { text: "Hi" });
    editor.exec("selectAll");
    editor.exec("toggleMark", { mark: { type: "bold" } });
    expect(editor.getHTML()).toContain("<strong>Hi</strong>");
    editor.exec("setBlock", { type: "heading", attrs: { level: 3 } });
    expect(editor.getCurrentBlock().type).toBe("heading");
    editor.destroy();
  });

  it("events ready change destroy", () => {
    const host = mount();
    const seen: string[] = [];
    const editor = new OraEditor({ element: host });
    editor.on("change", () => seen.push("change"));
    editor.on("destroy", () => seen.push("destroy"));
    editor.exec("insertText", { text: "x" });
    editor.destroy();
    expect(seen).toEqual(["change", "destroy"]);
  });

  it("enregistre et désinstalle un plugin", () => {
    const host = mount();
    let setup = false;
    let torn = false;
    const editor = new OraEditor({
      element: host,
      plugins: [
        {
          id: "test-plugin",
          name: "Test",
          version: "1.0.0",
          compatibleCore: "^0.1.0",
          setup: () => {
            setup = true;
            return () => {
              torn = true;
            };
          },
        },
      ],
    });
    expect(setup).toBe(true);
    editor.destroy();
    expect(torn).toBe(true);
  });

  it("toggleList, lien, alignement et indent", () => {
    const host = mount();
    const editor = new OraEditor({ element: host });
    editor.exec("insertText", { text: "Item" });
    editor.exec("toggleList", { ordered: false });
    expect(editor.getCurrentBlock().type).toBe("listItem");
    expect(editor.getHTML()).toContain("<ul>");
    editor.exec("indent");
    expect(editor.getCurrentBlock().attrs?.level).toBe(1);
    editor.exec("setAlign", { align: "center" });
    expect(editor.getCurrentBlock().attrs?.align).toBe("center");
    editor.exec("selectAll");
    editor.exec("setLink", { href: "https://ora.local" });
    expect(editor.getHTML()).toContain('href="https://ora.local"');
    editor.exec("unsetLink");
    expect(editor.getHTML()).not.toContain("href=");
    editor.exec("toggleList", { ordered: false });
    expect(editor.getCurrentBlock().type).toBe("paragraph");
    editor.destroy();
  });

  it("colle un fragment HTML structuré", () => {
    const host = mount();
    const editor = new OraEditor({ element: host });
    editor.insertHTML("<p>Un</p><p>Deux <strong>gras</strong></p>");
    const html = editor.getHTML();
    expect(html).toContain("Un");
    expect(html).toContain("Deux");
    expect(html).toContain("<strong>gras</strong>");
    editor.destroy();
  });

  it("affiche un popover au clic sur un lien et permet de le retirer", () => {
    const host = mount();
    const editor = new OraEditor({ element: host });
    editor.setHTML('<p>Un <a href="https://example.com">lien</a></p>');
    const anchor = host.querySelector("a[href]");
    expect(anchor).toBeTruthy();
    anchor?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const popover = host.querySelector(".ora-link-popover");
    expect(popover).toBeTruthy();
    expect(popover?.textContent).toContain("https://example.com");
    popover?.querySelector<HTMLButtonElement>("[data-remove]")?.click();
    expect(editor.getHTML()).not.toContain("href=");
    expect(host.querySelector(".ora-link-popover")).toBeNull();
    editor.destroy();
  });

  it("applique une couleur au texte sélectionné", () => {
    const host = mount();
    const editor = new OraEditor({ element: host });
    editor.exec("insertText", { text: "Rouge" });
    editor.exec("selectAll");
    editor.exec("setMark", { mark: { type: "color", value: "#dc2626" } });
    expect(editor.getHTML()).toContain("color: #dc2626");
    editor.destroy();
  });

  it("insère une image et un tableau", () => {
    const host = mount();
    const editor = new OraEditor({ element: host, preset: "full" });
    editor.exec("insertImage", { src: "https://example.com/pic.png", alt: "Pic" });
    expect(editor.getHTML()).toContain("<img");
    editor.exec("insertTable", { rows: 2, cols: 2 });
    expect(editor.getHTML()).toContain("<table>");
    expect(editor.getHTML()).toContain("<th>");
    editor.exec("tableAddColumn");
    const html = editor.getHTML();
    const headerCells = html.match(/<th>/g) ?? [];
    expect(headerCells.length).toBeGreaterThanOrEqual(3);
    editor.destroy();
  });

  it("applique un patch IA mock", async () => {
    const host = mount();
    const editor = new OraEditor({ element: host, content: "<p>Bonjour   monde</p>" });
    await editor.runAI("correct");
    expect(editor.getHTML()).toContain("Bonjour monde");
    editor.destroy();
  });

  it("ajoute un bouton plugin dans la toolbar", () => {
    const host = mount();
    let clicked = false;
    const editor = new OraEditor({
      element: host,
      toolbar: true,
      plugins: [
        {
          id: "hello",
          name: "Hello",
          version: "1.0.0",
          compatibleCore: "^0.1.0",
          setup(instance) {
            instance.ui.addToolbarButton({
              id: "hello",
              title: "Hello",
              label: "Hi",
              onClick: () => {
                clicked = true;
              },
            });
          },
        },
      ],
    });
    const button = host.querySelector<HTMLButtonElement>("[data-plugin='hello']");
    expect(button).toBeTruthy();
    button?.click();
    expect(clicked).toBe(true);
    editor.destroy();
  });

  it("monte la toolbar Core", () => {
    const host = mount();
    const editor = new OraEditor({ element: host, toolbar: true });
    expect(host.querySelector(".ora-toolbar")).toBeTruthy();
    editor.destroy();
    expect(host.querySelector(".ora-toolbar")).toBeNull();
  });
});
