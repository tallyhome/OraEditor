import { describe, expect, it } from "vitest";
import { fromHTML, toHTML } from "./html.js";

describe("HTML converters", () => {
  it("convertit titres, paragraphes et gras", () => {
    const doc = fromHTML("<h2>Titre</h2><p>Bonjour <strong>Fabien</strong></p>");
    expect(doc.content[0]).toMatchObject({ type: "heading", attrs: { level: 2 } });
    expect(toHTML(doc)).toContain("<h2>Titre</h2>");
    expect(toHTML(doc)).toContain("<strong>Fabien</strong>");
  });

  it("supprime script et javascript:", () => {
    const doc = fromHTML('<p>ok</p><script>alert(1)</script><p><a href="javascript:alert(1)">x</a></p>');
    const html = toHTML(doc);
    expect(html).not.toContain("script");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("ok");
  });

  it("ignore les gestionnaires d'événements", () => {
    const doc = fromHTML('<p onclick="alert(1)">texte</p>');
    expect(toHTML(doc)).toBe("<p>texte</p>");
  });

  it("round-trip italic et underline", () => {
    const html = "<p><em>a</em> <u>b</u></p>";
    expect(toHTML(fromHTML(html))).toContain("<em>a</em>");
    expect(toHTML(fromHTML(html))).toContain("<u>b</u>");
  });

  it("round-trip listes imbriquées", () => {
    const html = "<ul><li>A<ul><li>A1</li></ul></li><li>B</li></ul>";
    const doc = fromHTML(html);
    expect(doc.content).toHaveLength(3);
    expect(doc.content[0]).toMatchObject({ type: "listItem", attrs: { ordered: false, level: 0 } });
    expect(doc.content[1]).toMatchObject({ type: "listItem", attrs: { ordered: false, level: 1 } });
    expect(doc.content[2]).toMatchObject({ type: "listItem", attrs: { ordered: false, level: 0 } });
    const out = toHTML(doc);
    expect(out).toContain("<ul>");
    expect(out).toContain("<li>A1</li>");
    expect(out).toContain("<li>B</li>");
  });

  it("round-trip citation, code et alignement", () => {
    const doc = fromHTML('<blockquote>Note</blockquote><pre><code>const x = 1;</code></pre><p style="text-align: center">Centre</p>');
    expect(doc.content[0]?.type).toBe("blockquote");
    expect(doc.content[1]?.type).toBe("codeBlock");
    expect(doc.content[2]).toMatchObject({ type: "paragraph", attrs: { align: "center" } });
    const html = toHTML(doc);
    expect(html).toContain("<blockquote>");
    expect(html).toContain("<pre><code>");
    expect(html).toContain("text-align: center");
  });

  it("round-trip liens", () => {
    const html = '<p><a href="https://example.com" target="_blank" rel="noopener">site</a></p>';
    const out = toHTML(fromHTML(html));
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('target="_blank"');
  });

  it("parse image, tableau et embed YouTube", () => {
    const doc = fromHTML(
      '<figure><img src="https://example.com/a.png" alt="Chat"><figcaption>Légende</figcaption></figure>' +
        "<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>" +
        '<video src="https://example.com/a.mp4"></video>',
    );
    expect(doc.content[0]).toMatchObject({ type: "image", attrs: { src: "https://example.com/a.png", alt: "Chat", caption: "Légende" } });
    expect(doc.content[1]?.type).toBe("table");
    expect(doc.content[2]).toMatchObject({ type: "video" });
    expect(toHTML(doc)).toContain("<img");
    expect(toHTML(doc)).toContain("<table>");
    expect(toHTML(doc)).toContain("<video");
  });
});
