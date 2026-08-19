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

  it("traduit la toolbar et compte les mots", () => {
    const host = mount();
    const editor = new OraEditor({ element: host, toolbar: true, locale: "en" });
    expect(host.querySelector("[data-cmd=undo]")?.getAttribute("title")).toContain("Undo");
    editor.setLocale("ru");
    expect(host.querySelector("[data-cmd=undo]")?.getAttribute("title")).toContain("Отменить");
    editor.exec("insertText", { text: "Hello world" });
    expect(editor.getStats().words).toBe(2);
    editor.destroy();
  });

  it("applique taille, police et exposant", () => {
    const host = mount();
    const editor = new OraEditor({ element: host });
    editor.exec("insertText", { text: "Texte" });
    editor.exec("selectAll");
    editor.exec("setMark", { mark: { type: "fontSize", value: "20px" } });
    editor.exec("setMark", { mark: { type: "fontFamily", value: "Georgia, serif" } });
    editor.exec("toggleMark", { mark: { type: "superscript" } });
    const html = editor.getHTML();
    expect(html).toContain("font-size: 20px");
    expect(html).toContain("font-family: Georgia, serif");
    expect(html).toContain("<sup>");
    editor.destroy();
  });

  it("fusionne des cellules et pose un fond", () => {
    const host = mount();
    const editor = new OraEditor({ element: host, preset: "full" });
    editor.setHTML("<table><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table>");
    editor.dispatch((tr) => tr.setSelection({
      type: "text",
      anchor: { path: [0, 0, 0, 0], offset: 1 },
      focus: { path: [0, 0, 0, 0], offset: 1 },
    }), { history: false });
    editor.exec("tableMergeRight");
    expect(editor.getHTML()).toContain("colspan=\"2\"");
    expect(editor.getHTML()).toContain("AB");
    editor.exec("tableSetCellBackground", { value: "#fde68a" });
    expect(editor.getHTML()).toContain("background-color: #fde68a");
    editor.exec("tableSplitCell");
    expect(editor.getHTML()).not.toContain("colspan=");
    editor.dispatch((tr) => tr.setSelection({
      type: "text",
      anchor: { path: [0, 0, 0, 0], offset: 0 },
      focus: { path: [0, 0, 0, 0], offset: 0 },
    }), { history: false });
    editor.exec("tableToggleHeaderRow");
    expect(editor.getHTML()).toContain("<th");
    editor.destroy();
  });

  it("convertit les raccourcis Markdown", () => {
    const host = mount();
    const editor = new OraEditor({ element: host });
    for (const char of "# ") {
      editor.exec("insertText", { text: char });
    }
    expect(editor.getCurrentBlock().type).toBe("heading");
    editor.exec("insertText", { text: "Titre" });
    expect(editor.getHTML()).toContain("<h1>Titre</h1>");
    editor.exec("splitBlock");
    for (const char of "- ") {
      editor.exec("insertText", { text: char });
    }
    expect(editor.getCurrentBlock().type).toBe("listItem");
    editor.exec("splitBlock");
    for (const char of "**ok**") {
      editor.exec("insertText", { text: char });
    }
    expect(editor.getHTML()).toContain("<strong>ok</strong>");
    editor.destroy();
  });

  it("affiche un placeholder sur un document vide", () => {
    const host = mount();
    const editor = new OraEditor({ element: host, placeholder: "Votre texte" });
    const content = host.querySelector(".ora-content");
    expect(content?.classList.contains("ora-is-empty")).toBe(true);
    expect(content?.getAttribute("data-placeholder")).toBe("Votre texte");
    editor.destroy();
  });

  it("insère une ligne, un sommaire et une ancre", () => {
    const host = mount();
    const editor = new OraEditor({ element: host });
    editor.setHTML("<h2>Intro</h2><p></p>");
    editor.exec("setAnchor", { id: "intro" });
    expect(editor.getHTML()).toContain('id="intro"');
    editor.exec("insertHorizontalRule");
    expect(editor.getHTML()).toContain("<hr>");
    editor.exec("insertToc");
    expect(editor.getHTML()).toContain("ora-toc");
    editor.destroy();
  });

  it("convertit --- et *italique*", () => {
    const host = mount();
    const editor = new OraEditor({ element: host });
    for (const char of "---") {
      editor.exec("insertText", { text: char });
    }
    expect(editor.getHTML()).toContain("<hr>");
    for (const char of "*ok*") {
      editor.exec("insertText", { text: char });
    }
    expect(editor.getHTML()).toContain("<em>ok</em>");
    editor.destroy();
  });

  it("fusionne un rectangle de cellules et applique une taille libre", () => {
    const host = mount();
    const editor = new OraEditor({ element: host, preset: "full" });
    editor.setHTML("<table><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table>");
    editor.dispatch((tr) => tr.setSelection({ type: "cell", anchor: [0, 0, 0], focus: [0, 1, 1] }), { history: false });
    editor.exec("tableMergeSelection");
    expect(editor.getHTML()).toContain("colspan=\"2\"");
    expect(editor.getHTML()).toContain("rowspan=\"2\"");
    editor.destroy();
  });

  it("bascule le mode sombre", () => {
    const host = mount();
    const editor = new OraEditor({ element: host, theme: "light" });
    expect(host.classList.contains("ora-editor--dark")).toBe(false);
    editor.toggleTheme();
    expect(host.classList.contains("ora-editor--dark")).toBe(true);
    editor.destroy();
  });
});
