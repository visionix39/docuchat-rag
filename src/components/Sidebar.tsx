"use client";

import { Github, Settings2, X } from "lucide-react";
import { DocList } from "@/components/DocList";
import { Dropzone } from "@/components/Dropzone";
import { EngineStatus } from "@/components/EngineStatus";
import { IngestJobs } from "@/components/IngestJobs";
import { Button } from "@/components/ui/Button";

export function Sidebar({
  onOpenSettings,
  onClose,
}: {
  onOpenSettings: () => void;
  onClose?: () => void;
}) {
  return (
    <aside className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden border-r border-white/8 bg-ink-900/60 p-4 backdrop-blur-xl">
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-iris-500/30 to-aqua-500/20">
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path
                d="M6 3h8l4 4v13a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 20V4.5A1.5 1.5 0 0 1 5.5 3Z"
                fill="none"
                stroke="url(#sg)"
                strokeWidth="1.6"
              />
              <path d="M13.5 3v4.5H18" fill="none" stroke="url(#sg)" strokeWidth="1.6" />
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#a78bfa" />
                  <stop offset="1" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
            </svg>
          </span>
          <div>
            <p className="text-[15px] font-semibold leading-tight tracking-tight text-white">
              DocuChat
            </p>
            <p className="text-[11px] leading-tight text-mist-500">Client-side document RAG</p>
          </div>
        </div>

        {onClose ? (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close sidebar">
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </header>

      <div className="scroll-slim -mr-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        <Dropzone />
        <IngestJobs />
        <DocList />
      </div>

      <div className="space-y-3">
        <EngineStatus />

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onOpenSettings}>
            <Settings2 className="h-3.5 w-3.5" />
            Settings
          </Button>
          <a
            href="https://github.com/topics/retrieval-augmented-generation"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open source reference"
            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-mist-400 transition-colors hover:text-mist-100"
          >
            <Github className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </aside>
  );
}
