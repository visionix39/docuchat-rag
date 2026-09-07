"use client";

import { Cpu, HardDrive, Loader2, ShieldCheck, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { embedderStatus, subscribeEmbedder, type EmbedderStatus } from "@/lib/embedder";
import { findEmbeddingModel } from "@/lib/models";
import { useStore } from "@/lib/store";

export function EngineStatus() {
  const [status, setStatus] = useState<EmbedderStatus>(embedderStatus);
  const settings = useStore((state) => state.settings);
  const storage = useStore((state) => state.storage);
  const chunks = useStore((state) => state.chunks.length);

  useEffect(() => subscribeEmbedder(setStatus), []);

  const spec = findEmbeddingModel(settings.embeddingModel);
  const keywordOnly = settings.embeddingMode === "none";

  const line = keywordOnly
    ? "Keyword index only (BM25)"
    : status.state === "ready"
      ? `${spec.label} · ${status.dims}d · ${status.device === "webgpu" ? "WebGPU" : "WASM"}`
      : status.state === "loading"
        ? `${status.message ?? "Loading"} ${Math.round(status.downloadRatio * 100)}%`
        : status.state === "error"
          ? (status.message ?? "Model unavailable")
          : `${spec.label} · loads on first use (~${
            settings.preferWebGPU ? spec.approxSizeMb * 4 : spec.approxSizeMb
          } MB)`;

  const Icon =
    status.state === "loading" ? Loader2 : keywordOnly ? Cpu : status.state === "ready" ? Zap : Cpu;

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-ink-850/60 p-3">
      <div className="flex items-start gap-2">
        <Icon
          className={`mt-px h-3.5 w-3.5 shrink-0 ${
            status.state === "loading"
              ? "animate-spin text-iris-400"
              : status.state === "error"
                ? "text-rose-400"
                : status.state === "ready"
                  ? "text-lime-400"
                  : "text-mist-500"
          }`}
        />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mist-500">
            Search engine
          </p>
          <p className="mt-0.5 break-words text-[11.5px] leading-snug text-mist-300">{line}</p>
        </div>
      </div>

      {status.state === "loading" ? (
        <div className="h-1 overflow-hidden rounded-full bg-ink-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-iris-500 to-aqua-400 transition-[width]"
            style={{ width: `${Math.max(3, status.downloadRatio * 100)}%` }}
          />
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[11px] text-mist-500">
        <span className="inline-flex items-center gap-1">
          <HardDrive className="h-3 w-3" />
          {chunks} vectors
          {storage?.usage ? ` · ${(storage.usage / 1024 / 1024).toFixed(1)} MB` : ""}
        </span>
        <span className="inline-flex items-center gap-1 text-lime-400/80" title="No server involved">
          <ShieldCheck className="h-3 w-3" />
          local
        </span>
      </div>
    </div>
  );
}
