import type { ChatModelSpec, EmbeddingModelSpec, ProviderId, ProviderSpec } from "./types";

/**
 * Every visitor brings their own key — nothing here ships with credentials.
 * The key pattern is only a typo check before a request is wasted; the real
 * verdict comes from the provider when the key is tested.
 */
export const PROVIDERS: ProviderSpec[] = [
  {
    id: "anthropic",
    label: "Claude",
    vendor: "Anthropic",
    keyPlaceholder: "sk-ant-api03-…",
    keyPattern: /^sk-ant-/,
    consoleUrl: "https://console.anthropic.com/settings/keys",
    consoleLabel: "console.anthropic.com",
    blurb: "Strongest at long, citation-heavy answers over dense documents.",
  },
  {
    id: "openai",
    label: "GPT",
    vendor: "OpenAI",
    keyPlaceholder: "sk-proj-…",
    keyPattern: /^sk-/,
    consoleUrl: "https://platform.openai.com/api-keys",
    consoleLabel: "platform.openai.com",
    blurb: "Also works with any OpenAI-compatible endpoint — Groq, Together, OpenRouter.",
    configurableBaseUrl: true,
    defaultBaseUrl: "https://api.openai.com/v1",
  },
  {
    id: "google",
    label: "Gemini",
    vendor: "Google AI Studio",
    keyPlaceholder: "AIza…",
    keyPattern: /^AIza/,
    consoleUrl: "https://aistudio.google.com/app/apikey",
    consoleLabel: "aistudio.google.com",
    blurb: "Has a free tier, so it is the cheapest way to try this app end to end.",
  },
];

export const findProvider = (id: ProviderId) =>
  PROVIDERS.find((provider) => provider.id === id) ?? PROVIDERS[0];

/**
 * Pricing is USD per million tokens and powers the in-app estimate only —
 * the authoritative numbers live on each provider's pricing page, and a key
 * that can list models will refresh this list from the provider directly.
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
    contextLabel: "cheap and quick",
    inputPerMTok: 0.4,
    outputPerMTok: 1.6,
    supportsTemperature: true,
  },
  {
    id: "gpt-4.1",
    label: "GPT-4.1",
    provider: "openai",
    contextLabel: "higher quality",
    inputPerMTok: 2,
    outputPerMTok: 8,
    supportsTemperature: true,
  },
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    provider: "openai",
    contextLabel: "cheapest",
    inputPerMTok: 0.15,
    outputPerMTok: 0.6,
    supportsTemperature: true,
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "google",
    contextLabel: "1M context · free tier",
    inputPerMTok: 0.3,
    outputPerMTok: 2.5,
    supportsTemperature: true,
    supportsThoughts: true,
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "google",
    contextLabel: "1M context",
    inputPerMTok: 1.25,
    outputPerMTok: 10,
    supportsTemperature: true,
    supportsThoughts: true,
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash-Lite",
    provider: "google",
    contextLabel: "fastest · free tier",
    inputPerMTok: 0.1,
    outputPerMTok: 0.4,
    supportsTemperature: true,
  },
];

export const DEFAULT_MODEL: Record<ProviderId, string> = {
  anthropic: "claude-opus-5",
  openai: "gpt-4.1-mini",
  google: "gemini-2.5-flash",
};

export const findChatModel = (id: string) => CHAT_MODELS.find((model) => model.id === id);

/**
 * Models discovered from a visitor's key won't be in the table above, and a
 * model picked from that list still needs the right request shape — current
 * Claude models reject `temperature`, Gemini 2.5 can return thought
 * summaries. Infer from the id rather than sending a request that 400s.
 */
export function resolveChatModel(provider: ProviderId, id: string): ChatModelSpec {
  const known = findChatModel(id);
  if (known) return known;

  const base: ChatModelSpec = { id, label: id, provider, contextLabel: "custom" };

  if (provider === "anthropic") {
    // Opus/Sonnet 5 and the 4.6+ family: adaptive thinking, no sampling params.
    const adaptive = /^claude-(opus|sonnet|fable|mythos)-(5|4-[6-9])/.test(id);
    return adaptive
      ? { ...base, thinking: "adaptive" }
      : { ...base, thinking: "none", supportsTemperature: true };
  }

  if (provider === "google") {
    return {
      ...base,
      supportsTemperature: true,
      supportsThoughts: /^gemini-(2\.5|[3-9])/.test(id),
    };
  }

  return { ...base, supportsTemperature: true };
}

export const modelsForProvider = (provider: ProviderId) =>
  CHAT_MODELS.filter((model) => model.provider === provider);

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

export const findEmbeddingModel = (id: string) =>
  EMBEDDING_MODELS.find((model) => model.id === id) ?? EMBEDDING_MODELS[0];
