import type { AIProvider } from "./types.js";

/**
 * OraAI — prévu dans l'architecture, désactivé jusqu'à son développement (Phase 10).
 */
export const oraAIProvider: AIProvider = {
  id: "oraai",
  label: "OraAI",
  locality: "oraai",
  enabled: false,
  capabilities: ["correct", "rewrite", "translate", "summarize", "expand", "simplify", "generate"],
  async transform() {
    throw new Error("OraAI n'est pas encore disponible.");
  },
};
