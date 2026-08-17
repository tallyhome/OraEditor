import type { AIProvider } from "./types.js";

export class AIProviderRegistry {
  private providers = new Map<string, AIProvider>();
  activeId: string | null = null;

  register(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
    if (!this.activeId && provider.enabled !== false) {
      this.activeId = provider.id;
    }
  }

  get(id: string): AIProvider | undefined {
    return this.providers.get(id);
  }

  list(): AIProvider[] {
    return [...this.providers.values()];
  }

  active(): AIProvider | undefined {
    return this.activeId ? this.providers.get(this.activeId) : undefined;
  }
}
