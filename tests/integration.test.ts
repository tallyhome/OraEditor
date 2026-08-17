import { describe, expect, it } from "vitest";
import { OraEditor, fromJSON, mockAIProvider, oraAIProvider } from "@ora-editor/core";

describe("intégration Phase 2", () => {
  it("instancie l'éditeur dans le DOM", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const editor = new OraEditor({
      element: host,
      content: fromJSON({
        version: 1,
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Ora" }] }],
      }),
    });
    expect(host.querySelector(".ora-content")).toBeTruthy();
    expect(editor.getHTML()).toContain("Ora");
    editor.focus();
    editor.blur();
    editor.destroy();
    expect(host.querySelector(".ora-content")).toBeNull();
  });

  it("expose le mock IA et OraAI désactivé", () => {
    expect(mockAIProvider.enabled).not.toBe(false);
    expect(oraAIProvider.enabled).toBe(false);
    expect(oraAIProvider.id).toBe("oraai");
  });

  it("respecte le preset Simple", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const editor = new OraEditor({ element: host, toolbar: true, preset: "simple" });
    expect(editor.features.tables).toBe(false);
    expect(editor.features.ai).toBe(false);
    expect(host.querySelector("[data-cmd='table']")).toBeNull();
    expect(host.querySelector(".ora-ai-panel")).toBeNull();
    editor.destroy();
  });

  it("édite listes et liens via l'API", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const editor = new OraEditor({
      element: host,
      toolbar: true,
      content: "<p>Liste</p>",
    });
    editor.exec("toggleList", { ordered: true });
    expect(editor.getHTML()).toContain("<ol>");
    editor.exec("selectAll");
    editor.exec("setLink", { href: "https://example.com", target: "_blank" });
    expect(editor.getHTML()).toContain("https://example.com");
    editor.destroy();
  });
});
