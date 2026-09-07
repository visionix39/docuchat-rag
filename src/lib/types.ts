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
export type ProviderId = "anthropic" | "openai";

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
}

export interface Settings {
  provider: ProviderId;
  anthropicKey: string;
  anthropicModel: string;
  openaiKey: string;
  openaiModel: string;
  openaiBaseUrl: string;
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
