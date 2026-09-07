import { bm25Search, type Bm25Index } from "./bm25";
import type { Chunk, RetrievalMode } from "./types";
import { dot, mmrSelect } from "./vectors";

export interface ScoredChunk {
  chunk: Chunk;
  score: number;
  dense?: number;
  sparse?: number;
}

export interface RetrieveResult {
  results: ScoredChunk[];
  candidates: number;
  mode: RetrievalMode;
  ms: number;
}

/** Reciprocal Rank Fusion — rank-based, so it needs no score normalisation. */
const RRF_K = 60;

interface RetrieveOptions {
  query: string;
  chunks: Chunk[];
  bm25: Bm25Index;
  queryVector?: Float32Array;
  mode: RetrievalMode;
  topK: number;
}

export function retrieve({
  query,
  chunks,
  bm25,
  queryVector,
  mode,
  topK,
}: RetrieveOptions): RetrieveResult {
  const startedAt = performance.now();
  const byId = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  const allowed = new Set(byId.keys());
  const pool = Math.max(topK * 4, 24);

  const hasVectors = Boolean(queryVector) && chunks.some((chunk) => chunk.vector);
  const effectiveMode: RetrievalMode = hasVectors ? mode : "keyword";

  const sparse =
    effectiveMode === "semantic"
      ? []
      : bm25Search(bm25, query, { limit: pool, allow: allowed });

  const dense: Array<{ chunkId: string; score: number }> =
    effectiveMode === "keyword" || !queryVector
      ? []
      : chunks
          .filter((chunk) => chunk.vector)
          .map((chunk) => ({ chunkId: chunk.id, score: dot(queryVector, chunk.vector!) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, pool);

  const fused = new Map<string, ScoredChunk>();

  const merge = (
    list: Array<{ chunkId: string; score: number }>,
    key: "dense" | "sparse",
    weight: number,
  ) => {
    list.forEach((entry, rank) => {
      const chunk = byId.get(entry.chunkId);
      if (!chunk) return;
      const existing = fused.get(entry.chunkId) ?? { chunk, score: 0 };
      existing.score += weight / (RRF_K + rank + 1);
      existing[key] = entry.score;
      fused.set(entry.chunkId, existing);
    });
  };

  // A mild tilt toward dense results in hybrid mode: semantics usually beat
  // literal term overlap on natural-language questions, but keyword matching
  // is what saves you on names, IDs and rare acronyms.
  merge(dense, "dense", effectiveMode === "hybrid" ? 1.15 : 1);
  merge(sparse, "sparse", effectiveMode === "hybrid" ? 0.85 : 1);

  const ranked = [...fused.values()].sort((a, b) => b.score - a.score);
  const shortlist = ranked.slice(0, Math.max(topK * 3, topK + 6));

  const selected = mmrSelect(
    shortlist,
    topK,
    (item) => item.score / (ranked[0]?.score || 1),
    (item) => item.chunk.vector,
  );

  // Reading order beats score order once the model is the reader.
  selected.sort((a, b) =>
    a.chunk.docId === b.chunk.docId
      ? a.chunk.index - b.chunk.index
      : a.chunk.docId.localeCompare(b.chunk.docId),
  );

  return {
    results: selected,
    candidates: ranked.length,
    mode: effectiveMode,
    ms: Math.round(performance.now() - startedAt),
  };
}

/**
 * Follow-ups like "and the second one?" carry no retrievable terms on their
 * own, so we fold in the previous turn before searching. Cheap, local, and it
 * avoids spending an extra LLM call on query rewriting.
 */
export function expandQuery(query: string, history: Array<{ role: string; content: string }>): string {
  const trimmed = query.trim();
  const looksDependent =
    trimmed.split(/\s+/).length <= 7 ||
    /^(and|also|what about|how about|why|why not|then|it|its|they|those|these|that|this|he|she|them)\b/i.test(
      trimmed,
    );
  if (!looksDependent) return trimmed;

  const lastUser = [...history].reverse().find((message) => message.role === "user");
  return lastUser ? `${lastUser.content}\n${trimmed}` : trimmed;
}
