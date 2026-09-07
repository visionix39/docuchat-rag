"use client";

import { FilePlus2, Loader2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { SUPPORTED_LABEL } from "@/lib/extract";
import { useStore } from "@/lib/store";

export function Dropzone() {
  const ingest = useStore((state) => state.ingest);
  const busy = useStore((state) => state.jobs.length > 0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = useCallback(
    (files: FileList | null) => {
      if (files?.length) void ingest([...files]);
    },
    [ingest],
  );

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        handle(event.dataTransfer.files);
      }}
      className={`group relative rounded-xl border border-dashed p-4 text-center transition-colors ${
        dragging
          ? "border-iris-400 bg-iris-500/10"
          : "border-white/12 bg-white/[0.02] hover:border-white/25"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.md,.markdown,.csv,.tsv,.json,.log,text/*,application/pdf"
        className="hidden"
        onChange={(event) => {
          handle(event.target.files);
          event.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="focus-ring flex w-full flex-col items-center gap-2 rounded-lg py-1"
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-ink-800 transition-colors ${
            dragging ? "text-iris-300" : "text-mist-400 group-hover:text-mist-200"
          }`}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
        </span>
        <span className="text-[13px] font-medium text-mist-100">
          {dragging ? "Drop to index" : "Add documents"}
        </span>
        <span className="text-[11px] leading-tight text-mist-500">
          Drop files or click · {SUPPORTED_LABEL}
        </span>
      </button>
    </div>
  );
}
