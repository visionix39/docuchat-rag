"use client";

import { create } from "zustand";
import { buildBm25Index, type Bm25Index } from "./bm25";
import { chunkText } from "./chunker";
import { embedQuery, embedTexts, isEmbeddingSupported, loadEmbedder } from "./embedder";
import { extractFile, isSupported, pageForOffset } from "./extract";
import * as idb from "./idb";
import { DEFAULT_MODEL, findEmbeddingModel, findProvider } from "./models";
import { buildContext, buildUserTurn, SYSTEM_PROMPT_OPEN, SYSTEM_PROMPT_STRICT } from "./prompt";
import { completions, describeError, probes } from "./providers";
import { expandQuery, retrieve } from "./retriever";
import { estimateTokens } from "./tokenize";
import type {
  ChatMessage,
  Chunk,
  Citation,
  DocMeta,
  KeyStatus,
  ProviderCredentials,
  ProviderId,
  Settings,
} from "./types";

const SETTINGS_KEY = "docuchat.settings.v1";
const CHAT_KEY = "chat.messages.v1";

export const EMPTY_CREDENTIALS: Record<ProviderId, ProviderCredentials> = {
  anthropic: { key: "", model: DEFAULT_MODEL.anthropic },
  openai: { key: "", model: DEFAULT_MODEL.openai, baseUrl: "https://api.openai.com/v1" },
  google: { key: "", model: DEFAULT_MODEL.google },
};

export const DEFAULT_SETTINGS: Settings = {
  provider: "anthropic",
  credentials: EMPTY_CREDENTIALS,
  persistKeys: false,
  embeddingMode: "local",
  embeddingModel: "Xenova/all-MiniLM-L6-v2",
  preferWebGPU: false,
  retrievalMode: "hybrid",
  topK: 6,
  chunkSize: 1100,
  chunkOverlap: 180,
  temperature: 0.2,
  strictGrounding: true,
  effort: "medium",
  showReasoning: true,
};

export interface IngestJob {
  id: string;
  name: string;
  stage: "extracting" | "chunking" | "embedding" | "done" | "error";
  ratio: number;
  detail?: string;
}

interface Toast {
  id: string;
  tone: "error" | "info" | "success";
  message: string;
}

interface State {
  ready: boolean;
  settings: Settings;
  docs: DocMeta[];
  chunks: Chunk[];
  bm25: Bm25Index;
  messages: ChatMessage[];
  jobs: IngestJob[];
  toasts: Toast[];
  generating: boolean;
  activeCitation: Citation | null;
  storage: { usage: number; quota: number } | null;

  keyStatus: Record<ProviderId, KeyStatus>;

  hydrate: () => Promise<void>;
  setSettings: (patch: Partial<Settings>) => void;
  setCredentials: (provider: ProviderId, patch: Partial<ProviderCredentials>) => void;
  verifyKey: (provider: ProviderId) => Promise<boolean>;
  ingest: (files: File[]) => Promise<void>;
  removeDoc: (id: string) => Promise<void>;
  toggleDoc: (id: string) => Promise<void>;
  clearLibrary: () => Promise<void>;
  ask: (question: string) => Promise<void>;
  stop: () => void;
  clearChat: () => void;
  openCitation: (citation: Citation | null) => void;
  dismissToast: (id: string) => void;
  notify: (tone: Toast["tone"], message: string) => void;
}

const EMPTY_INDEX: Bm25Index = { postings: new Map(), lengths: new Map(), avgLength: 0, size: 0 };

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function loadSettings(): Settings {
  if (typeof localStorage === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const stored = JSON.parse(raw) as Partial<Settings>;
    const merged: Settings = {
      ...DEFAULT_SETTINGS,
      ...stored,
      // Merge per provider so a settings file written before a provider
      // existed doesn't wipe the others' defaults.
      credentials: {
        anthropic: { ...EMPTY_CREDENTIALS.anthropic, ...stored.credentials?.anthropic },
        openai: { ...EMPTY_CREDENTIALS.openai, ...stored.credentials?.openai },
        google: { ...EMPTY_CREDENTIALS.google, ...stored.credentials?.google },
      },
    };

    // Drop fields this version no longer knows about. Older builds kept keys
    // in top-level `anthropicKey` / `openaiKey`; without this they would sit
    // in localStorage forever, even with "remember my key" switched off.
    return Object.fromEntries(
      (Object.keys(DEFAULT_SETTINGS) as Array<keyof Settings>).map((key) => [key, merged[key]]),
    ) as unknown as Settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: Settings) {
  if (typeof localStorage === "undefined") return;
  // API keys are only written to disk when the user opts in; otherwise they
  // live in memory for the tab's lifetime and nowhere else.
  const persisted: Settings = settings.persistKeys
    ? settings
    : {
        ...settings,
        credentials: {
          anthropic: { ...settings.credentials.anthropic, key: "" },
          openai: { ...settings.credentials.openai, key: "" },
          google: { ...settings.credentials.google, key: "" },
        },
      };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(persisted));
  } catch {
    /* quota or private mode — settings simply won't survive a reload */
  }
}

let controller: AbortController | null = null;

export const useStore = create<State>((set, get) => ({
  ready: false,
  settings: DEFAULT_SETTINGS,
  docs: [],
  chunks: [],
  bm25: EMPTY_INDEX,
  messages: [],
  jobs: [],
  toasts: [],
  generating: false,
  activeCitation: null,
  storage: null,
  keyStatus: { anthropic: { state: "unknown" }, openai: { state: "unknown" }, google: { state: "unknown" } },

  notify: (tone, message) => {
    const id = uid();
    set((state) => ({ toasts: [...state.toasts, { id, tone, message }] }));
    setTimeout(() => get().dismissToast(id), tone === "error" ? 9000 : 4000);
  },

  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  hydrate: async () => {
    const settings = loadSettings();
    try {
      const [docs, chunks, messages, storage] = await Promise.all([
        idb.allDocs(),
        idb.allChunks(),
        idb.kvGet<ChatMessage[]>(CHAT_KEY),
        idb.storageEstimate(),
      ]);
      set({
        ready: true,
        settings,
        docs,
        chunks,
        bm25: buildBm25Index(chunks),
        messages: messages ?? [],
        storage,
      });
    } catch (error) {
      set({ ready: true, settings });
      get().notify("error", `Local storage unavailable: ${describeError(error)}`);
    }
  },

  setSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    saveSettings(settings);
    set({ settings });
  },

  setCredentials: (provider, patch) => {
    const current = get().settings;
    const settings: Settings = {
      ...current,
      credentials: {
        ...current.credentials,
        [provider]: { ...current.credentials[provider], ...patch },
      },
    };
    saveSettings(settings);

    // Editing the key or endpoint invalidates whatever the last check said.
    const resetStatus = "key" in patch || "baseUrl" in patch;
    set((state) => ({
      settings,
      keyStatus: resetStatus
        ? { ...state.keyStatus, [provider]: { state: "unknown" } }
        : state.keyStatus,
    }));
  },

  /**
   * Confirms a key works by listing the models it can reach — a free call on
   * all three providers, so a visitor can check their key without being
   * billed for a token. The result also refreshes the model picker, which
   * keeps it honest as providers add and retire models.
   */
  verifyKey: async (provider) => {
    const credentials = get().settings.credentials[provider];
    const spec = findProvider(provider);

    if (!credentials.key.trim()) {
      set((state) => ({
        keyStatus: {
          ...state.keyStatus,
          [provider]: { state: "invalid", message: `Paste a ${spec.vendor} key first.` },
        },
      }));
      return false;
    }

    set((state) => ({
      keyStatus: { ...state.keyStatus, [provider]: { state: "checking" } },
    }));

    try {
      const models = await probes[provider]({
        apiKey: credentials.key.trim(),
        baseUrl: credentials.baseUrl,
      });

      set((state) => ({
        keyStatus: {
          ...state.keyStatus,
          [provider]: {
            state: "valid",
            message: models.length
              ? `Key works — ${models.length} models available.`
              : "Key works.",
            models,
            checkedAt: Date.now(),
          },
        },
      }));

      // If the stored model isn't on this key, fall back to one that is.
      if (models.length && !models.some((model) => model.id === credentials.model)) {
        const preferred =
          models.find((model) => model.id === DEFAULT_MODEL[provider]) ?? models[0];
        get().setCredentials(provider, { model: preferred.id });
      }
      return true;
    } catch (error) {
      set((state) => ({
        keyStatus: {
          ...state.keyStatus,
          [provider]: { state: "invalid", message: describeError(error), checkedAt: Date.now() },
        },
      }));
      return false;
    }
  },

  ingest: async (files) => {
    const { settings, notify } = get();
    const accepted = files.filter(isSupported);
    const rejected = files.length - accepted.length;
    if (rejected > 0) notify("error", `${rejected} file(s) skipped — unsupported format.`);
    if (!accepted.length) return;

    const wantsVectors = settings.embeddingMode === "local" && isEmbeddingSupported();
    const spec = findEmbeddingModel(settings.embeddingModel);

    if (wantsVectors) {
      try {
        await loadEmbedder(settings.embeddingModel, settings.preferWebGPU);
      } catch (error) {
        notify(
          "error",
          `Embedding model failed to load (${describeError(error)}). Falling back to keyword search.`,
        );
      }
    }

    const useVectors = wantsVectors && isEmbeddingSupported();

    for (const file of accepted) {
      const docId = uid();
      const job: IngestJob = { id: docId, name: file.name, stage: "extracting", ratio: 0 };
      set((state) => ({ jobs: [...state.jobs, job] }));

      const patchJob = (patch: Partial<IngestJob>) =>
        set((state) => ({
          jobs: state.jobs.map((entry) => (entry.id === docId ? { ...entry, ...patch } : entry)),
        }));

      try {
        const extracted = await extractFile(file, (ratio) => patchJob({ ratio: ratio * 0.4 }));
        if (!extracted.text.trim()) {
          throw new Error("No selectable text found — this looks like a scanned image PDF.");
        }

        patchJob({ stage: "chunking", ratio: 0.45 });
        const specs = chunkText(extracted.text, {
          size: settings.chunkSize,
          overlap: settings.chunkOverlap,
        });
        if (!specs.length) throw new Error("Document produced no usable chunks.");

        let vectors: Float32Array[] = [];
        if (useVectors) {
          patchJob({ stage: "embedding", ratio: 0.5, detail: spec.label });
          vectors = await embedTexts(
            specs.map((chunk) => chunk.text),
            (done, total) => patchJob({ ratio: 0.5 + (done / total) * 0.5 }),
          );
        }

        const chunks: Chunk[] = specs.map((chunk, index) => ({
          id: `${docId}:${index}`,
          docId,
          index,
          text: chunk.text,
          page: pageForOffset(extracted.pageOffsets, chunk.charStart),
          charStart: chunk.charStart,
          charEnd: chunk.charEnd,
          tokens: estimateTokens(chunk.text),
          vector: vectors[index],
        }));

        const doc: DocMeta = {
          id: docId,
          name: file.name,
          mime: file.type || "application/octet-stream",
          size: file.size,
          pages: extracted.pages,
          chars: extracted.text.length,
          chunkCount: chunks.length,
          createdAt: Date.now(),
          embedModel: useVectors ? settings.embeddingModel : null,
          status: "ready",
          enabled: true,
        };

        await idb.putChunks(chunks);
        await idb.putDoc(doc);

        const allChunks = [...get().chunks, ...chunks];
        set((state) => ({
          docs: [...state.docs, doc],
          chunks: allChunks,
          bm25: buildBm25Index(allChunks),
          jobs: state.jobs.filter((entry) => entry.id !== docId),
        }));
        notify("success", `${file.name} indexed — ${chunks.length} chunks.`);
      } catch (error) {
        patchJob({ stage: "error", detail: describeError(error) });
        notify("error", `${file.name}: ${describeError(error)}`);
        setTimeout(
          () => set((state) => ({ jobs: state.jobs.filter((entry) => entry.id !== docId) })),
          8000,
        );
      }
    }

    set({ storage: await idb.storageEstimate() });
  },

  removeDoc: async (id) => {
    await idb.deleteDoc(id);
    const chunks = get().chunks.filter((chunk) => chunk.docId !== id);
    set((state) => ({
      docs: state.docs.filter((doc) => doc.id !== id),
      chunks,
      bm25: buildBm25Index(chunks),
    }));
    set({ storage: await idb.storageEstimate() });
  },

  toggleDoc: async (id) => {
    const doc = get().docs.find((entry) => entry.id === id);
    if (!doc) return;
    const next = { ...doc, enabled: !doc.enabled };
    await idb.putDoc(next);
    set((state) => ({ docs: state.docs.map((entry) => (entry.id === id ? next : entry)) }));
  },

  clearLibrary: async () => {
    await idb.clearAll();
    set({ docs: [], chunks: [], bm25: EMPTY_INDEX, storage: await idb.storageEstimate() });
  },

  clearChat: () => {
    set({ messages: [] });
    void idb.kvSet(CHAT_KEY, []);
  },

  openCitation: (citation) => set({ activeCitation: citation }),

  stop: () => {
    controller?.abort();
    controller = null;
    set({ generating: false });
  },

  ask: async (question) => {
    const { settings, docs, chunks, bm25, messages, notify } = get();
    const trimmed = question.trim();
    if (!trimmed || get().generating) return;

    const credentials = settings.credentials[settings.provider];
    const apiKey = credentials.key.trim();
    if (!apiKey) {
      notify(
        "error",
        `Add your own ${findProvider(settings.provider).vendor} API key before asking a question.`,
      );
      return;
    }
    if (!docs.some((doc) => doc.enabled)) {
      notify("error", "No documents in scope. Upload one, or re-enable one in the sidebar.");
      return;
    }

    const userMessage: ChatMessage = {
      id: uid(),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };
    const assistantId = uid();
    const placeholder: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      streaming: true,
    };

    set({ messages: [...messages, userMessage, placeholder], generating: true });

    const patch = (update: Partial<ChatMessage>) =>
      set((state) => ({
        messages: state.messages.map((message) =>
          message.id === assistantId ? { ...message, ...update } : message,
        ),
      }));

    controller = new AbortController();

    try {
      const enabledDocIds = new Set(docs.filter((doc) => doc.enabled).map((doc) => doc.id));
      const scope = chunks.filter((chunk) => enabledDocIds.has(chunk.docId));

      const searchQuery = expandQuery(
        trimmed,
        messages.slice(-4).map(({ role, content }) => ({ role, content })),
      );

      let queryVector: Float32Array | undefined;
      const hasVectors = scope.some((chunk) => chunk.vector);
      if (hasVectors && settings.retrievalMode !== "keyword") {
        try {
          await loadEmbedder(settings.embeddingModel, settings.preferWebGPU);
          queryVector = await embedQuery(searchQuery, settings.embeddingModel);
        } catch {
          notify("info", "Semantic search unavailable for this query — used keyword search.");
        }
      }

      const found = retrieve({
        query: searchQuery,
        chunks: scope,
        bm25,
        queryVector,
        mode: settings.retrievalMode,
        topK: settings.topK,
      });

      const docMap = new Map(docs.map((doc) => [doc.id, doc]));
      const { block, citations } = buildContext(found.results, docMap);

      patch({
        citations,
        retrieval: {
          mode: found.mode,
          candidates: found.candidates,
          kept: found.results.length,
          ms: found.ms,
        },
      });

      const history = messages
        .filter((message) => !message.error && message.content.trim())
        .slice(-6)
        .map(({ role, content }) => ({ role, content }));

      const stream = completions[settings.provider]({
        apiKey,
        model: credentials.model,
        system: settings.strictGrounding ? SYSTEM_PROMPT_STRICT : SYSTEM_PROMPT_OPEN,
        turns: [...history, { role: "user", content: buildUserTurn(trimmed, block) }],
        temperature: settings.temperature,
        effort: settings.effort,
        showReasoning: settings.showReasoning,
        baseUrl: credentials.baseUrl,
        signal: controller.signal,
      });

      let answer = "";
      let reasoning = "";
      let refused = false;

      for await (const event of stream) {
        if (event.type === "text") {
          answer += event.text;
          patch({ content: answer });
        } else if (event.type === "reasoning") {
          reasoning += event.text;
          patch({ reasoning });
        } else if (event.type === "usage") {
          patch({ usage: { input: event.input, output: event.output } });
        } else if (event.type === "refusal") {
          refused = true;
          patch({
            error: `The model declined this request.${event.explanation ? ` ${event.explanation}` : ""}`,
          });
        }
      }

      if (!answer.trim() && !refused) {
        patch({ error: "The model returned an empty response. Try rephrasing the question." });
      }
      patch({ streaming: false });
    } catch (error) {
      const aborted = error instanceof Error && /abort/i.test(error.name + error.message);
      patch({
        streaming: false,
        error: aborted ? "Stopped." : describeError(error),
      });
      if (!aborted) notify("error", describeError(error));
    } finally {
      controller = null;
      set({ generating: false });
      void idb.kvSet(CHAT_KEY, get().messages);
    }
  },
}));
