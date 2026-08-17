import type { AIProvider, AIRequest, AIResponse } from "./types.js";

export function createProxyProvider(options: {
  id: string;
  label: string;
  locality: "remote" | "local";
  proxyUrl: string;
}): AIProvider {
  return {
    id: options.id,
    label: options.label,
    locality: options.locality,
    enabled: true,
    capabilities: ["correct", "rewrite", "translate", "summarize", "expand", "simplify", "generate"],
    async transform(req: AIRequest): Promise<AIResponse> {
      const response = await fetch(options.proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!response.ok) {
        throw new Error(`Provider ${options.id} : HTTP ${response.status}`);
      }
      const data = (await response.json()) as AIResponse;
      if (!data || !Array.isArray(data.patches)) {
        throw new Error(`Provider ${options.id} : réponse invalide.`);
      }
      return data;
    },
  };
}

export function createOpenAIProvider(proxyUrl: string): AIProvider {
  return createProxyProvider({ id: "openai", label: "OpenAI", locality: "remote", proxyUrl });
}

export function createCustomProvider(proxyUrl: string): AIProvider {
  return createProxyProvider({ id: "custom", label: "API personnalisée", locality: "remote", proxyUrl });
}
