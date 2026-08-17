export type AICapability =
  | "correct"
  | "rewrite"
  | "translate"
  | "summarize"
  | "expand"
  | "simplify"
  | "generate";

export type AILocality = "local" | "remote" | "oraai";

export type AIScope = "selection" | "block" | "document";

export interface AIRequest {
  op: AICapability;
  scope: AIScope;
  fragments: Array<{ path: number[]; text: string }>;
  language?: string;
  style?: string;
  instruction?: string;
}

export interface AIResponse {
  patches: Array<{ path: number[]; text: string }>;
}

export interface AIProvider {
  id: string;
  label: string;
  locality: AILocality;
  enabled?: boolean;
  capabilities: AICapability[];
  transform: (req: AIRequest) => Promise<AIResponse>;
}
