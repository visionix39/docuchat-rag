export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface CompletionRequest {
  apiKey: string;
  model: string;
  system: string;
  turns: ChatTurn[];
  temperature: number;
  effort: "low" | "medium" | "high";
  showReasoning: boolean;
  baseUrl?: string;
  signal: AbortSignal;
}

export type StreamEvent =
  | { type: "reasoning"; text: string }
  | { type: "text"; text: string }
  | { type: "usage"; input: number; output: number }
  | { type: "refusal"; explanation: string };

export type Completion = (request: CompletionRequest) => AsyncGenerator<StreamEvent>;

export interface ProbeRequest {
  apiKey: string;
  baseUrl?: string;
  signal?: AbortSignal;
}

/**
 * Validates a key by listing the models it can reach. Every provider offers
 * this as a free, non-generative call, so a visitor can confirm their key
 * works without spending a token.
 */
export type ModelProbe = (request: ProbeRequest) => Promise<Array<{ id: string; label: string }>>;

/** Turns provider SDK/HTTP failures into something worth showing a user. */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    if (/401|403|invalid.*api.?key|api key not valid|authentication|permission/i.test(message)) {
      return "That API key was rejected by the provider. Check you pasted it in full.";
    }
    if (/404|not found|is not supported|no such model/i.test(message)) {
      return "That model isn't available on this key. Pick another from the model list.";
    }
    if (/429|rate.?limit/i.test(message)) {
      return "Rate limited by the provider. Wait a moment and retry.";
    }
    if (/credit|billing|quota/i.test(message)) {
      return "The provider reports a billing or quota problem on this key.";
    }
    if (/Failed to fetch|NetworkError|load failed/i.test(message)) {
      return "Network request blocked. Check your connection, ad-blocker, or CORS extensions.";
    }
    return message;
  }
  return String(error);
}
