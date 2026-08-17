export interface LocalEngine {
  id: string;
  label: string;
  endpoint: string;
  generate: (prompt: string) => Promise<string>;
}

export function createOllamaEngine(endpoint = "http://127.0.0.1:11434", model = "llama3.2"): LocalEngine {
  return {
    id: "ollama",
    label: "Ollama (local)",
    endpoint,
    async generate(prompt: string) {
      const response = await fetch(`${endpoint.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!response.ok) {
        throw new Error(`Ollama : HTTP ${response.status}`);
      }
      const data = (await response.json()) as { message?: { content?: string } };
      return data.message?.content ?? "";
    },
  };
}
