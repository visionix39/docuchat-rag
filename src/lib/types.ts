export type DocStatus = "queued" | "extracting" | "chunking" | "embedding" | "ready" | "error";

/** A retrievable slice of a document, plus its (optional) dense embedding. */
export interface Chunk {
  id: string;
  docId: string;
  index: number;
  text: string;
  /** 1-indexed page number, when the source format has pages. */
  page?: number;
  charStart: number;
  charEnd: number;
  /** Rough token count (chars / 4) — used for context budgeting only. */
  tokens: number;
  vector?: Float32Array;
}

export interface DocMeta {
  id: string;
  name: string;
  mime: string;
  size: number;
  pages?: number;
  chars: number;
  chunkCount: number;
  createdAt: number;
  /** The embedding model used, or null when the doc is keyword-indexed only. */
  embedModel: string | null;
  status: DocStatus;
  error?: string;
  /** Whether the doc is in scope for retrieval. */
  enabled: boolean;
}

export interface Citation {
  n: number;
  chunkId: string;
  docId: string;
  docName: string;
  page?: number;
  text: string;
  score: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Summarised model reasoning, when the provider and settings expose it. */
  reasoning?: string;
  citations?: Citation[];
  createdAt: number;
  error?: string;
  streaming?: boolean;
  usage?: { input: number; output: number };
  /** How the sources for this answer were found — surfaced in the UI. */
  retrieval?: { mode: RetrievalMode; candidates: number; kept: number; ms: number };
}

export type RetrievalMode = "hybrid" | "semantic" | "keyword";
export type EmbeddingMode = "local" | "none";
export type ProviderId = "anthropic" | "openai" | "google";

export interface EmbeddingModelSpec {
  id: string;
  label: string;
  dims: number;
  approxSizeMb: number;
  /** Some models expect an instruction prefix on the query side. */
  queryPrefix?: string;
  note: string;
}

export interface ChatModelSpec {
  id: string;
  label: string;
  provider: ProviderId;
  contextLabel: string;
  /** USD per million tokens, for the in-app cost estimate. */
  inputPerMTok?: number;
  outputPerMTok?: number;
  /** Opt into server-side refusal fallbacks (Anthropic frontier models). */
  serverFallbacks?: boolean;
  /**
   * Current Anthropic frontier models reject `temperature` outright, so the
   * slider is hidden rather than sent and 400'd.
   */
  supportsTemperature?: boolean;
  /** `adaptive` on 4.6+ models; older models take an explicit token budget. */
  thinking?: "adaptive" | "budget" | "none";
  /** Gemini 2.5+ can return its thought summaries alongside the answer. */
  supportsThoughts?: boolean;
}

export interface ProviderSpec {
  id: ProviderId;
  /** What a visitor calls it, not what the vendor calls itself. */
  label: string;
  vendor: string;
  keyPlaceholder: string;
  keyPattern: RegExp;
  consoleUrl: string;
  consoleLabel: string;
  blurb: string;
  /** Only the OpenAI-compatible path lets you repoint the endpoint. */
  configurableBaseUrl?: boolean;
  defaultBaseUrl?: string;
}

export interface ProviderCredentials {
  key: string;
  model: string;
  baseUrl?: string;
}

export type KeyState = "unknown" | "checking" | "valid" | "invalid";

export interface KeyStatus {
  state: KeyState;
  message?: string;
  /** Model ids discovered from the provider with this key. */
  models?: Array<{ id: string; label: string }>;
  checkedAt?: number;
}

export interface Settings {
  provider: ProviderId;
  /** One credential set per provider, so switching doesn't lose a key. */
  credentials: Record<ProviderId, ProviderCredentials>;
  persistKeys: boolean;
  embeddingMode: EmbeddingMode;
  embeddingModel: string;
  preferWebGPU: boolean;
  retrievalMode: RetrievalMode;
  topK: number;
  chunkSize: number;
  chunkOverlap: number;
  temperature: number;
  strictGrounding: boolean;
  effort: "low" | "medium" | "high";
  showReasoning: boolean;
}
