import { describe, expect, it } from "vitest";
import { isSafeUrl } from "./urls.js";
import { validateImageFile } from "./files.js";

describe("Sécurité URLs", () => {
  it("autorise http(s) et chemins relatifs", () => {
    expect(isSafeUrl("https://example.com/a")).toBe(true);
    expect(isSafeUrl("/storage/editor/a.jpg")).toBe(true);
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("data:text/html;base64,aaa")).toBe(false);
  });
});

describe("Validation fichiers", () => {
  it("refuse svg et extensions inconnues", () => {
    const png = new File(["x"], "photo.png", { type: "image/png" });
    expect(validateImageFile(png)).toBeNull();
    const svg = new File(["<svg>"], "x.svg", { type: "image/svg+xml" });
    expect(validateImageFile(svg)).toContain("non autoris");
  });
});
