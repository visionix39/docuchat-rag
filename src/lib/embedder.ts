import { findEmbeddingModel } from "./models";

type WorkerOut =
  | { type: "download"; file: string; ratio: number }
  | { type: "ready"; model: string; dims: number; device: string }
  | { type: "batch"; requestId: string; done: number; total: number }
  | { type: "embedded"; requestId: string; vectors: Float32Array[]; dims: number }
  | { type: "error"; requestId?: string; message: string };

export interface EmbedderStatus {
  state: "idle" | "loading" | "ready" | "error";
  webgpu: boolean;
  model: string | null;
  device: string | null;
  dims: number | null;
  downloadRatio: number;
  message: string | null;
}

type Listener = (status: EmbedderStatus) => void;

let worker: Worker | null = null;
let status: EmbedderStatus = {
  state: "idle",
  webgpu: false,
  model: null,
  device: null,
  dims: null,
  downloadRatio: 0,
  message: null,
};

const listeners = new Set<Listener>();
const pending = new Map<
  string,
  {
    resolve: (vectors: Float32Array[]) => void;
    reject: (error: Error) => void;
    onProgress?: (done: number, total: number) => void;
  }
>();
let readyWaiters: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];
let counter = 0;

function emit(patch: Partial<EmbedderStatus>) {
  status = { ...status, ...patch };
  for (const listener of listeners) listener(status);
}

export function subscribeEmbedder(listener: Listener): () => void {
  listeners.add(listener);
  listener(status);
  return () => listeners.delete(listener);
}

export const embedderStatus = () => status;

export function isEmbeddingSupported(): boolean {
  return typeof Worker !== "undefined" && typeof WebAssembly !== "undefined";
}

function ensureWorker(): Worker {
  if (worker) return worker;

  worker = new Worker(new URL("../workers/embed.worker.ts", import.meta.url), { type: "module" });

  worker.addEventListener("message", (event: MessageEvent<WorkerOut>) => {
    const message = event.data;
    switch (message.type) {
      case "download":
        emit({ downloadRatio: message.ratio, message: `Downloading ${message.file}` });
        break;
      case "ready":
        emit({
          state: "ready",
          model: message.model,
          dims: message.dims,
          device: message.device,
          downloadRatio: 1,
          message: null,
        });
        readyWaiters.forEach((waiter) => waiter.resolve());
        readyWaiters = [];
        break;
      case "batch":
        pending.get(message.requestId)?.onProgress?.(message.done, message.total);
        break;
      case "embedded": {
        pending.get(message.requestId)?.resolve(message.vectors);
        pending.delete(message.requestId);
        break;
      }
      case "error": {
        const error = new Error(message.message);
        if (message.requestId) {
          pending.get(message.requestId)?.reject(error);
          pending.delete(message.requestId);
        } else {
          emit({ state: "error", message: message.message });
          readyWaiters.forEach((waiter) => waiter.reject(error));
          readyWaiters = [];
        }
        break;
      }
    }
  });

  worker.addEventListener("error", (event) => {
    emit({ state: "error", message: event.message || "Embedding worker crashed." });
    readyWaiters.forEach((waiter) => waiter.reject(new Error("Embedding worker crashed.")));
    readyWaiters = [];
  });

  return worker;
}

/** Idempotent: loads (and warms) the model, resolving once it can embed. */
export function loadEmbedder(model: string, preferWebGPU = false): Promise<void> {
  if (!isEmbeddingSupported()) {
    return Promise.reject(new Error("This browser cannot run local embedding models."));
  }
  if (status.state === "ready" && status.model === model && status.webgpu === preferWebGPU) {
    return Promise.resolve();
  }

  const instance = ensureWorker();
  if (status.state !== "loading" || status.model !== model || status.webgpu !== preferWebGPU) {
    emit({
      state: "loading",
      model,
      webgpu: preferWebGPU,
      downloadRatio: 0,
      message: "Preparing model…",
    });
    instance.postMessage({ type: "load", model, preferWebGPU });
  }

  return new Promise((resolve, reject) => readyWaiters.push({ resolve, reject }));
}

export function embedTexts(
  texts: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<Float32Array[]> {
  if (!texts.length) return Promise.resolve([]);
  const instance = ensureWorker();
  const requestId = `e${++counter}`;

  return new Promise((resolve, reject) => {
    pending.set(requestId, { resolve, reject, onProgress });
    instance.postMessage({ type: "embed", requestId, texts });
  });
}

/** Embeds a search query, applying the model's instruction prefix if it has one. */
export async function embedQuery(query: string, model: string): Promise<Float32Array> {
  const spec = findEmbeddingModel(model);
  const [vector] = await embedTexts([`${spec.queryPrefix ?? ""}${query}`]);
  return vector;
}

export function disposeEmbedder() {
  worker?.terminate();
  worker = null;
  pending.clear();
  readyWaiters = [];
  emit({
    state: "idle",
    webgpu: false,
    model: null,
    device: null,
    dims: null,
    downloadRatio: 0,
    message: null,
  });
}
