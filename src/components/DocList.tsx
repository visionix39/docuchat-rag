"use client";

import { FileText, Layers, Sparkles, Trash2, Type } from "lucide-react";
import { useStore } from "@/lib/store";
import type { DocMeta } from "@/lib/types";

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

function DocRow({ doc }: { doc: DocMeta }) {
  const toggleDoc = useStore((state) => state.toggleDoc);
  const removeDoc = useStore((state) => state.removeDoc);

  return (
    <li
      className={`group rounded-xl border p-3 transition-colors ${
        doc.enabled
          ? "border-white/10 bg-ink-850/70 hover:border-white/20"
          : "border-white/5 bg-ink-900/40 opacity-55 hover:opacity-80"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={doc.enabled}
          onChange={() => void toggleDoc(doc.id)}
          aria-label={`Include ${doc.name} in retrieval`}
          className="focus-ring mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-iris-500"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-mist-100" title={doc.name}>
            {doc.name}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-mist-500">
            <span className="inline-flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {doc.chunkCount} chunks
            </span>
            {doc.pages ? (
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {doc.pages}p
              </span>
            ) : null}
            <span>{formatBytes(doc.size)}</span>
            <span
              className={`inline-flex items-center gap-1 ${
                doc.embedModel ? "text-iris-400/90" : "text-amber-400/80"
              }`}
              title={
                doc.embedModel
                  ? `Vector-indexed with ${doc.embedModel}`
                  : "Keyword-indexed only (BM25)"
              }
            >
              {doc.embedModel ? <Sparkles className="h-3 w-3" /> : <Type className="h-3 w-3" />}
              {doc.embedModel ? "vectors" : "keyword"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void removeDoc(doc.id)}
          aria-label={`Remove ${doc.name}`}
          className="focus-ring rounded-md p-1 text-mist-500 opacity-0 transition hover:bg-rose-400/10 hover:text-rose-400 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

export function DocList() {
  const docs = useStore((state) => state.docs);
  if (!docs.length) return null;

  const active = docs.filter((doc) => doc.enabled).length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-mist-500">
          Library
        </h2>
        <span className="text-[11px] tabular-nums text-mist-500">
          {active}/{docs.length} in scope
        </span>
      </div>
      <ul className="space-y-2">
        {docs.map((doc) => (
          <DocRow key={doc.id} doc={doc} />
        ))}
      </ul>
    </div>
  );
}
