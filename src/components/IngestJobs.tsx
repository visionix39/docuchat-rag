"use client";

import { AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";

const STAGE_LABEL: Record<string, string> = {
  extracting: "Reading text",
  chunking: "Chunking",
  embedding: "Embedding",
  done: "Done",
  error: "Failed",
};

export function IngestJobs() {
  const jobs = useStore((state) => state.jobs);
  if (!jobs.length) return null;

  return (
    <ul className="space-y-2">
      {jobs.map((job) => (
        <li key={job.id} className="rise rounded-xl border border-white/10 bg-ink-850/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-medium text-mist-100">{job.name}</p>
            <span
              className={`shrink-0 text-[11px] tabular-nums ${
                job.stage === "error" ? "text-rose-400" : "text-mist-400"
              }`}
            >
              {job.stage === "error" ? "failed" : `${Math.round(job.ratio * 100)}%`}
            </span>
          </div>

          {job.stage === "error" ? (
            <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-rose-300/90">
              <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
              {job.detail}
            </p>
          ) : (
            <>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-iris-500 to-aqua-400 transition-[width] duration-300"
                  style={{ width: `${Math.max(4, job.ratio * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-mist-500">
                {STAGE_LABEL[job.stage]}
                {job.detail ? ` · ${job.detail}` : ""}
              </p>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
