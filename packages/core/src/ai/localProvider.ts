import type { AIProvider } from "./types.js";
import type { LocalEngine } from "./local.js";

export function createLocalProvider(engine: LocalEngine): AIProvider {
  return {
    id: "local",
    label: engine.label,
    locality: "local",
    enabled: true,
    capabilities: ["correct", "rewrite", "translate", "summarize", "expand", "simplify", "generate"],
    async transform(req) {
      const prompt = [
        `Opération: ${req.op}`,
        req.language ? `Langue: ${req.language}` : "",
        req.instruction ?? "",
        "Renvoie uniquement le texte transformé, un fragment par ligne, dans le même ordre.",
        ...req.fragments.map((fragment, index) => `${index + 1}. ${fragment.text}`),
      ]
        .filter(Boolean)
        .join("\n");
      const output = await engine.generate(prompt);
      const lines = output.split("\n").map((line: string) => line.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
      return {
        patches: req.fragments.map((fragment, index) => ({
          path: fragment.path,
          text: lines[index] ?? fragment.text,
        })),
      };
    },
  };
}
