import { describe, expect, it } from "vitest";
import { cleanPastedHtml } from "./index.js";

describe("Clipboard HTML", () => {
  it("extrait le fragment Word et retire le bruit MSO", () => {
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office">
        <head><style>p.MsoNormal { mso-margin: 0; }</style></head>
        <body>
          <!--StartFragment-->
          <p class="MsoNormal" style="mso-margin-top-alt:0; color: #111111">Hello <b style="font-weight:normal">World</b><!--EndFragment-->
        </body>
      </html>
    `;
    const cleaned = cleanPastedHtml(html);
    expect(cleaned).not.toContain("MsoNormal");
    expect(cleaned).not.toContain("mso-");
    expect(cleaned).not.toContain("<style");
    expect(cleaned).toContain("Hello");
    expect(cleaned).toContain("World");
  });

  it("unwrap le wrapper Google Docs", () => {
    const html = `<b id="docs-internal-guid-abc" style="font-weight:normal"><p>Docs</p></b>`;
    const cleaned = cleanPastedHtml(html);
    expect(cleaned).not.toContain("docs-internal-guid");
    expect(cleaned).toContain("<p>Docs</p>");
  });
});
