"use client";

import { FileText, Hash } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { useStore } from "@/lib/store";

export function SourceDrawer() {
  const citation = useStore((state) => state.activeCitation);
  const openCitation = useStore((state) => state.openCitation);
  const messages = useStore((state) => state.messages);

  if (!citation) return null;

  // Neighbouring citations from the same answer, so the reader can page
  // through the evidence without closing the drawer.
  const siblings =
    messages
      .slice()
      .reverse()
      .find((message) => message.citations?.some((entry) => entry.chunkId === citation.chunkId))
      ?.citations ?? [];

  return (
    <Sheet
      open
      side="right"
      width="max-w-xl"
      onClose={() => openCitation(null)}
      title={citation.docName}
      subtitle={
        citation.page ? `Page ${citation.page} · excerpt ${citation.n}` : `Excerpt ${citation.n}`
      }
      footer={
        siblings.length > 1 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] text-mist-500">Other excerpts:</span>
            {siblings.map((entry) => (
              <button
                key={entry.chunkId}
                type="button"
                onClick={() => openCitation(entry)}
                aria-current={entry.chunkId === citation.chunkId}
                className={`focus-ring h-6 min-w-6 rounded-md border px-1.5 font-mono text-[11px] transition-colors ${
                  entry.chunkId === citation.chunkId
                    ? "border-iris-400/60 bg-iris-500/25 text-white"
                    : "border-white/10 bg-white/[0.03] text-mist-400 hover:border-iris-400/40 hover:text-white"
                }`}
              >
                {entry.n}
              </button>
            ))}
          </div>
        ) : null
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-mist-500">
        <span className="inline-flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          {citation.docName}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Hash className="h-3.5 w-3.5" />
          relevance {citation.score.toFixed(4)}
        </span>
      </div>

      <blockquote className="rounded-xl border border-white/10 bg-ink-850/60 p-4 font-mono text-[12.5px] leading-relaxed text-mist-200 whitespace-pre-wrap">
        {citation.text}
      </blockquote>

      <p className="mt-4 text-[11.5px] leading-relaxed text-mist-500">
        This is the verbatim chunk that was placed in the model&rsquo;s context — nothing between
        it and the answer was summarised or rewritten.
      </p>
    </Sheet>
  );
}
