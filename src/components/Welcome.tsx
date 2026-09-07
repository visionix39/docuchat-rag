"use client";

import { Braces, Cpu, Database, KeyRound, Search, Sparkles } from "lucide-react";

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

export function Welcome({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="mb-8">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-mist-400">
          <Sparkles className="h-3 w-3 text-iris-400" />
          No server · no vector database · no subscription
        </span>

        <h1 className="mt-4 text-[26px] font-semibold leading-tight tracking-tight text-white sm:text-[32px]">
          Chat with your documents,
          <br />
          <span className="accent-text">without sending them anywhere.</span>
        </h1>

        <p className="mt-3 text-[14.5px] leading-relaxed text-mist-400">
          Drop a PDF or DOCX into the sidebar. It is parsed, chunked, embedded and searched entirely
          inside this tab. The only thing that ever leaves your browser is the handful of passages
          your question actually matched — sent with your own API key, straight to the model
          provider.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {PIPELINE.map((step, index) => (
          <div
            key={step.title}
            className="rounded-xl border border-white/8 bg-ink-850/50 p-4 transition-colors hover:border-white/15"
          >
            <div className="flex items-center gap-2">
              <step.icon className="h-3.5 w-3.5 text-iris-400" />
              <span className="font-mono text-[10px] text-mist-500">
                0{index + 1}
              </span>
              <h2 className="text-[13px] font-semibold text-white">{step.title}</h2>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-mist-400">{step.body}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onOpenSettings}
        className="focus-ring mt-4 flex w-full items-start gap-3 rounded-xl border border-iris-400/20 bg-iris-500/[0.07] p-4 text-left transition-colors hover:border-iris-400/40 hover:bg-iris-500/[0.12]"
      >
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-iris-300" />
        <span>
          <span className="block text-[13px] font-semibold text-white">
            Add your API key to start asking
          </span>
          <span className="mt-1 block text-[12.5px] leading-relaxed text-mist-400">
            Anthropic or any OpenAI-compatible endpoint. Kept in this browser, in memory by default.
          </span>
        </span>
      </button>
    </div>
  );
}
