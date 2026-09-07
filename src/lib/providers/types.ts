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

/** Turns provider SDK/HTTP failures into something worth showing a user. */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    if (/401|invalid.*api.?key|authentication/i.test(message)) {
      return "The API key was rejected. Check it in Settings.";
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
