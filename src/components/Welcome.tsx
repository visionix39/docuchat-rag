"use client";

import { Braces, CheckCircle2, Cpu, Database, KeyRound, Search, Settings2, Sparkles } from "lucide-react";
import { useState } from "react";
import { ApiKeySetup } from "@/components/ApiKeySetup";
import { Button } from "@/components/ui/Button";
import { findProvider } from "@/lib/models";
import { useStore } from "@/lib/store";

const PIPELINE = [
  {
    icon: Braces,
    title: "Parse",
    body: "pdf.js and mammoth pull clean text out of PDFs and DOCX in a worker, keeping page offsets so citations can point at real pages.",
  },
  {
    icon: Cpu,
    title: "Chunk & embed",
    body: "Recursive splitting on paragraph and sentence boundaries, then a sentence-transformer runs on-device via WebGPU or WASM.",
  },
  {
    icon: Database,
    title: "Store",
    body: "Vectors and text land in IndexedDB. Reload the tab and your library is still there — no database, no bucket, no bill.",
  },
  {
    icon: Search,
    title: "Retrieve",
    body: "BM25 and cosine similarity are fused with reciprocal rank fusion, then MMR trims near-duplicates before the prompt is built.",
  },
];

function KeyPanel({ onOpenSettings }: { onOpenSettings: () => void }) {
  const settings = useStore((state) => state.settings);
  const keyStatus = useStore((state) => state.keyStatus);

  const provider = findProvider(settings.provider);
  const status = keyStatus[settings.provider];
  const hasKey = !!settings.credentials[settings.provider].key.trim();

  // Once a key is in and confirmed, get out of the way — but stay one click
  // from being changed.
  const [expanded, setExpanded] = useState(!hasKey);
  const settled = hasKey && status.state === "valid" && !expanded;

  if (settled) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-lime-400/25 bg-lime-400/[0.07] p-4">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-lime-400" />
        <span className="min-w-0 flex-1 text-[13px] text-mist-200">
          Using your own {provider.vendor} key ·{" "}
          <span className="font-mono text-[12px] text-mist-400">
            {settings.credentials[settings.provider].model}
          </span>
        </span>
        <Button variant="outline" size="sm" onClick={() => setExpanded(true)}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-iris-400/25 bg-iris-500/[0.07] p-5">
      <div className="mb-4 flex items-start gap-3">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-iris-300" />
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-semibold text-white">Bring your own API key</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-mist-400">
            This demo ships with no credentials of its own. Pick a provider, paste a key from your
            own account, and test it — it is stored in your browser and sent only to that provider.
          </p>
        </div>
        {hasKey ? (
          <Button variant="ghost" size="sm" onClick={() => setExpanded(false)}>
            Done
          </Button>
        ) : null}
      </div>

      <ApiKeySetup />

      <button
        type="button"
        onClick={onOpenSettings}
        className="focus-ring mt-4 inline-flex items-center gap-1.5 rounded text-[11.5px] text-mist-500 hover:text-mist-200"
      >
        <Settings2 className="h-3 w-3" />
        Retrieval, chunking and indexing options
      </button>
    </div>
  );
}

export function Welcome({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="mb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-mist-400">
          <Sparkles className="h-3 w-3 text-iris-400" />
          No server · no vector database · bring your own key
        </span>

        <h1 className="mt-4 text-[26px] font-semibold leading-tight tracking-tight text-white sm:text-[32px]">
          Chat with your documents,
          <br />
          <span className="accent-text">without sending them anywhere.</span>
        </h1>

        <p className="mt-3 text-[14.5px] leading-relaxed text-mist-400">
          Drop a PDF or DOCX into the sidebar. It is parsed, chunked, embedded and searched entirely
          inside this tab. The only thing that ever leaves your browser is the handful of passages
          your question actually matched — sent with your own API key, straight to Claude, GPT or
          Gemini.
        </p>
      </div>

      <div className="mb-6">
        <KeyPanel onOpenSettings={onOpenSettings} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {PIPELINE.map((step, index) => (
          <div
            key={step.title}
            className="rounded-xl border border-white/8 bg-ink-850/50 p-4 transition-colors hover:border-white/15"
          >
            <div className="flex items-center gap-2">
              <step.icon className="h-3.5 w-3.5 text-iris-400" />
              <span className="font-mono text-[10px] text-mist-500">0{index + 1}</span>
              <h2 className="text-[13px] font-semibold text-white">{step.title}</h2>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-mist-400">{step.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
