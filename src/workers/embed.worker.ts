/// <reference lib="webworker" />
import {
  env,
  pipeline,
  type FeatureExtractionPipeline,
  type ProgressInfo,
} from "@huggingface/transformers";

// Models stream from the Hugging Face CDN and are cached by the browser's
// Cache Storage, so a repeat visit loads them without a network round trip.
env.allowLocalModels = false;
env.useBrowserCache = true;
if (env.backends?.onnx?.wasm) {
  // Multi-threaded WASM needs SharedArrayBuffer, which needs COOP/COEP headers
  // that would in turn block loading models cross-origin. Single thread it is.
  env.backends.onnx.wasm.numThreads = 1;
}

type Incoming =
  | { type: "load"; model: string; preferWebGPU?: boolean }
  | { type: "embed"; requestId: string; texts: string[]; batchSize?: number };

type Outgoing =
  | { type: "download"; file: string; ratio: number }
  | { type: "ready"; model: string; dims: number; device: string }
  | { type: "batch"; requestId: string; done: number; total: number }
  | { type: "embedded"; requestId: string; vectors: Float32Array[]; dims: number }
  | { type: "error"; requestId?: string; message: string };

const post = (message: Outgoing, transfer?: Transferable[]) =>
  transfer ? self.postMessage(message, transfer) : self.postMessage(message);

let extractor: FeatureExtractionPipeline | null = null;
let loadedModel: string | null = null;
let loading: Promise<FeatureExtractionPipeline> | null = null;
let device = "wasm";
let loadedWebGPU = false;

function onDownload(info: ProgressInfo) {
  if (info.status === "progress" && "progress" in info) {
    post({ type: "download", file: info.file ?? "model", ratio: (info.progress ?? 0) / 100 });
  }
}

async function load(model: string, preferWebGPU: boolean): Promise<FeatureExtractionPipeline> {
  const cached = extractor && loadedModel === model && loadedWebGPU === preferWebGPU;
  if (cached && extractor) return extractor;
  if (loading && loadedModel === model && loadedWebGPU === preferWebGPU) return loading;

  loadedModel = model;
  loadedWebGPU = preferWebGPU;
  loading = (async () => {
    // WebGPU is much faster per chunk but needs the full-precision weights —
    // roughly 4x the download of the quantised WASM build. The default keeps
    // first use cheap; the WebGPU path is opt-in from Settings.
    if (preferWebGPU) {
      try {
        const gpu = (navigator as Navigator & { gpu?: unknown }).gpu;
        if (gpu) {
          const built = await pipeline("feature-extraction", model, {
            device: "webgpu",
            dtype: "fp32",
            progress_callback: onDownload,
          });
          device = "webgpu";
          extractor = built;
          return built;
        }
      } catch {
        // Fall through to WASM below.
      }
    }

    const built = await pipeline("feature-extraction", model, {
      device: "wasm",
      dtype: "q8",
      progress_callback: onDownload,
    });
    device = "wasm";
    extractor = built;
    return built;
  })();

  return loading;
}

async function embed(requestId: string, texts: string[], batchSize: number) {
  if (!extractor) throw new Error("Embedding model is not loaded.");

  const vectors: Float32Array[] = [];
  let dims = 0;

  for (let start = 0; start < texts.length; start += batchSize) {
    const batch = texts.slice(start, start + batchSize);
    const output = await extractor(batch, { pooling: "mean", normalize: true });
    const flat = output.data as Float32Array;
    dims = flat.length / batch.length;

    for (let i = 0; i < batch.length; i += 1) {
      vectors.push(new Float32Array(flat.subarray(i * dims, (i + 1) * dims)));
    }

    post({ type: "batch", requestId, done: Math.min(start + batchSize, texts.length), total: texts.length });
    // Yield so download/progress messages are not starved on the WASM path.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  post(
    { type: "embedded", requestId, vectors, dims },
    vectors.map((vector) => vector.buffer),
  );
}

self.addEventListener("message", async (event: MessageEvent<Incoming>) => {
  const message = event.data;
  try {
    if (message.type === "load") {
      const built = await load(message.model, message.preferWebGPU ?? false);
      const probe = await built(["dimension probe"], { pooling: "mean", normalize: true });
      post({ type: "ready", model: message.model, dims: (probe.data as Float32Array).length, device });
      return;
    }
    if (message.type === "embed") {
      await embed(message.requestId, message.texts, message.batchSize ?? 12);
    }
  } catch (error) {
    const requestId = "requestId" in message ? message.requestId : undefined;
    post({ type: "error", requestId, message: error instanceof Error ? error.message : String(error) });
  }
});
