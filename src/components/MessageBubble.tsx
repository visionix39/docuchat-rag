"use client";

import {
  AlertCircle,
  Brain,
  ChevronDown,
  Copy,
  FileText,
  Gauge,
  Layers,
  Search,
} from "lucide-react";
import { useState } from "react";
import { Markdown } from "@/components/Markdown";
import { findChatModel } from "@/lib/models";
import { useStore } from "@/lib/store";
import type { ChatMessage } from "@/lib/types";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard denied — nothing useful to say */
        }
      }}
      className="focus-ring inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-mist-500 transition-colors hover:bg-white/5 hover:text-mist-200"
    >
      <Copy className="h-3 w-3" />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function RetrievalMeta({ message }: { message: ChatMessage }) {
  const settings = useStore((state) => state.settings);
  const model = findChatModel(settings.credentials[settings.provider].model);
  const spend =
    message.usage && model?.inputPerMTok && model?.outputPerMTok
      ? (message.usage.input / 1e6) * model.inputPerMTok +
        (message.usage.output / 1e6) * model.outputPerMTok
      : null;

  if (!message.retrieval && !message.usage) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/5 pt-2.5 text-[11px] text-mist-500">
      {message.retrieval ? (
        <>
          <span className="inline-flex items-center gap-1">
            <Search className="h-3 w-3" />
            {message.retrieval.mode}
          </span>
          <span className="inline-flex items-center gap-1">
            <Layers className="h-3 w-3" />
            {message.retrieval.kept} of {message.retrieval.candidates} candidates
          </span>
          <span className="tabular-nums">{message.retrieval.ms} ms</span>
        </>
      ) : null}
      {message.usage ? (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Gauge className="h-3 w-3" />
          {message.usage.input.toLocaleString()} in / {message.usage.output.toLocaleString()} out
          {spend !== null ? ` · ~$${spend.toFixed(4)}` : ""}
        </span>
      ) : null}
      <CopyButton text={message.content} />
    </div>
  );
}

function Sources({ message }: { message: ChatMessage }) {
  const openCitation = useStore((state) => state.openCitation);
  const [expanded, setExpanded] = useState(false);
  const citations = message.citations ?? [];
  if (!citations.length) return null;

  const cited = new Set(
    [...message.content.matchAll(/\[(\d{1,2})\]/g)].map((match) => Number(match[1])),
  );
  const shown = expanded ? citations : citations.filter((entry) => cited.has(entry.n));
  const hidden = citations.length - shown.length;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {shown.map((citation) => (
          <button
            key={citation.chunkId}
            type="button"
            onClick={() => openCitation(citation)}
            className="focus-ring group inline-flex max-w-[15rem] items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-mist-400 transition-colors hover:border-iris-400/40 hover:bg-iris-500/10 hover:text-mist-100"
          >
            <span className="font-mono text-[10px] font-semibold text-iris-300">
              {citation.n}
            </span>
            <FileText className="h-3 w-3 shrink-0 opacity-60" />
            <span className="truncate">{citation.docName}</span>
            {citation.page ? (
              <span className="shrink-0 text-mist-500">p{citation.page}</span>
            ) : null}
          </button>
        ))}

        {hidden > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="focus-ring rounded-lg px-2 py-1 text-[11px] text-mist-500 transition-colors hover:bg-white/5 hover:text-mist-200"
          >
            +{hidden} retrieved, uncited
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Reasoning({ text, streaming }: { text: string; streaming?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-white/8 bg-ink-900/60">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="focus-ring flex w-full items-center gap-2 px-3 py-2 text-left text-[11.5px] text-mist-400 transition-colors hover:text-mist-200"
      >
        <Brain className="h-3.5 w-3.5 text-iris-400" />
        <span className="flex-1">{streaming ? "Reasoning…" : "Reasoning summary"}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="scroll-slim max-h-64 overflow-y-auto border-t border-white/8 px-3 py-2.5 text-[12.5px] leading-relaxed text-mist-400 whitespace-pre-wrap">
          {text}
        </div>
      ) : null}
    </div>
  );
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const openCitation = useStore((state) => state.openCitation);

  if (message.role === "user") {
    return (
      <div className="rise flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md border border-iris-400/20 bg-iris-500/12 px-4 py-2.5 text-sm leading-relaxed text-mist-100">
          {message.content}
        </div>
      </div>
    );
  }

  const thinking = message.streaming && !message.content && !message.reasoning;

  return (
    <div className="rise flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-iris-500/25 to-aqua-500/15">
        <span className="text-[11px] font-bold accent-text">AI</span>
      </div>

      <div className="min-w-0 flex-1">
        {message.reasoning ? (
          <Reasoning text={message.reasoning} streaming={message.streaming} />
        ) : null}

        {thinking ? (
          <p className="flex items-center gap-2 py-1 text-sm text-mist-400">
            <span className="flex gap-1">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-iris-400"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </span>
            Searching your documents…
          </p>
        ) : null}

        {message.content ? (
          <>
            <Markdown
              content={message.content}
              citations={message.citations}
              onOpenCitation={openCitation}
            />
            {message.streaming ? <span className="caret" /> : null}
          </>
        ) : null}

        {message.error ? (
          <p className="mt-1 flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-500/8 px-3 py-2 text-[13px] leading-relaxed text-rose-200">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {message.error}
          </p>
        ) : null}

        {!message.streaming ? (
          <>
            <Sources message={message} />
            <RetrievalMeta message={message} />
          </>
        ) : null}
      </div>
    </div>
  );
}
