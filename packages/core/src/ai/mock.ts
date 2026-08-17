import type { AICapability, AIProvider } from "./types.js";

function mockTransform(op: AICapability, text: string, language?: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  switch (op) {
    case "correct":
      return clean;
    case "rewrite":
      return clean;
    case "translate":
      return language ? `[${language}] ${clean}` : clean;
    case "summarize":
      return clean.split(/[.!?]/)[0]?.trim() || clean;
    case "expand":
      return clean ? `${clean} —` : clean;
    case "simplify":
      return clean;
    case "generate":
      return clean || "Nouveau contenu.";
    default:
      return clean;
  }
}

/** Provider de développement : renvoie les fragments inchangés. */
export const mockAIProvider: AIProvider = {
  id: "mock",
  label: "Mock",
  locality: "local",
  enabled: true,
  capabilities: ["correct", "rewrite", "translate", "summarize", "expand", "simplify", "generate"],
  async transform(req) {
    return {
      patches: req.fragments.map((fragment) => ({
        path: fragment.path,
        text: mockTransform(req.op, fragment.text, req.language),
      })),
    };
  },
};
