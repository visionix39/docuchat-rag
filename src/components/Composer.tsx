"use client";

import { ArrowUp, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";

export function Composer({ suggestions }: { suggestions?: string[] }) {
  const ask = useStore((state) => state.ask);
  const stop = useStore((state) => state.stop);
  const generating = useStore((state) => state.generating);
  const docs = useStore((state) => state.docs);
  const settings = useStore((state) => state.settings);

  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasKey = settings.provider === "anthropic" ? !!settings.anthropicKey : !!settings.openaiKey;
  const inScope = docs.filter((doc) => doc.enabled).length;
  const blocked = !inScope || !hasKey;

  // Grow with content up to a sensible ceiling, then scroll.
  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 200)}px`;
  }, [value]);

  const submit = () => {
    const question = value.trim();
    if (!question || generating || blocked) return;
    setValue("");
    void ask(question);
  };

  const placeholder = !inScope
    ? "Upload a document to start asking questions…"
    : !hasKey
      ? "Add your API key in Settings to start asking…"
      : `Ask anything about ${inScope === 1 ? "this document" : `these ${inScope} documents`}…`;

  return (
    <div className="space-y-2.5">
      {suggestions?.length && !value && !generating ? (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setValue(suggestion);
                textareaRef.current?.focus();
              }}
              className="focus-ring rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-left text-[12px] text-mist-300 transition-colors hover:border-iris-400/40 hover:bg-iris-500/10 hover:text-white"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      <div className="panel flex items-end gap-2 p-2 focus-within:border-iris-400/40">
        <textarea
          ref={textareaRef}
          value={value}
          rows={1}
          disabled={blocked}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          className="scroll-slim max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent px-2.5 py-2.5 text-sm leading-relaxed text-mist-100 placeholder:text-mist-500 focus:outline-none disabled:cursor-not-allowed"
        />

        {generating ? (
          <button
            type="button"
            onClick={stop}
            aria-label="Stop generating"
            className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-mist-200 transition-colors hover:bg-white/10"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim() || blocked}
            aria-label="Send question"
            className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-iris-500 to-iris-600 text-white shadow-[0_6px_20px_-8px_rgba(124,58,237,0.9)] transition-all hover:from-iris-400 hover:to-iris-500 disabled:bg-ink-700 disabled:from-ink-700 disabled:to-ink-700 disabled:text-mist-500 disabled:shadow-none"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="px-1 text-[11px] text-mist-500">
        <kbd className="rounded border border-white/10 bg-white/[0.04] px-1 py-px font-mono text-[10px]">
          Enter
        </kbd>{" "}
        to send ·{" "}
        <kbd className="rounded border border-white/10 bg-white/[0.04] px-1 py-px font-mono text-[10px]">
          Shift + Enter
        </kbd>{" "}
        for a new line · answers are grounded in {settings.topK} retrieved passages
      </p>
    </div>
  );
}
