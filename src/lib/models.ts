import type { ChatModelSpec, EmbeddingModelSpec } from "./types";

/**
 * Pricing is USD per million tokens and powers the in-app estimate only —
 * the authoritative numbers live on each provider's pricing page.
 */
export const CHAT_MODELS: ChatModelSpec[] = [
  {
    id: "claude-opus-5",
    label: "Claude Opus 5",
    provider: "anthropic",
    contextLabel: "1M context",
    inputPerMTok: 5,
    outputPerMTok: 25,
    serverFallbacks: true,
    thinking: "adaptive",
  },
  {
    id: "claude-sonnet-5",
    label: "Claude Sonnet 5",
    provider: "anthropic",
    contextLabel: "1M context",
    inputPerMTok: 2,
    outputPerMTok: 10,
    thinking: "adaptive",
  },
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    provider: "anthropic",
    contextLabel: "200K context",
    inputPerMTok: 1,
    outputPerMTok: 5,
    supportsTemperature: true,
    thinking: "none",
  },
  {
    id: "gpt-4.1-mini",
    label: "GPT-4.1 mini",
    provider: "openai",
    contextLabel: "OpenAI-compatible",
    inputPerMTok: 0.4,
    outputPerMTok: 1.6,
    supportsTemperature: true,
  },
  {
    id: "gpt-4.1",
    label: "GPT-4.1",
    provider: "openai",
    contextLabel: "OpenAI-compatible",
    inputPerMTok: 2,
    outputPerMTok: 8,
    supportsTemperature: true,
  },
];

export const EMBEDDING_MODELS: EmbeddingModelSpec[] = [
  {
    id: "Xenova/all-MiniLM-L6-v2",
    label: "MiniLM L6 v2",
    dims: 384,
    approxSizeMb: 23,
    note: "Fastest download, solid general-purpose quality.",
  },
  {
    id: "Xenova/bge-small-en-v1.5",
    label: "BGE small en v1.5",
    dims: 384,
    approxSizeMb: 34,
    queryPrefix: "Represent this sentence for searching relevant passages: ",
    note: "Stronger retrieval, slightly larger download.",
  },
  {
    id: "Xenova/gte-small",
    label: "GTE small",
    dims: 384,
    approxSizeMb: 34,
    note: "Good on long, prose-heavy documents.",
  },
];

export const findChatModel = (id: string) => CHAT_MODELS.find((m) => m.id === id);
export const findEmbeddingModel = (id: string) =>
  EMBEDDING_MODELS.find((m) => m.id === id) ?? EMBEDDING_MODELS[0];
