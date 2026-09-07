import { tokenize } from "./tokenize";

const K1 = 1.5;
const B = 0.75;

interface Posting {
  chunkId: string;
  tf: number;
}

export interface Bm25Index {
  postings: Map<string, Posting[]>;
  lengths: Map<string, number>;
  avgLength: number;
  size: number;
}

export function buildBm25Index(docs: Array<{ id: string; text: string }>): Bm25Index {
  const postings = new Map<string, Posting[]>();
  const lengths = new Map<string, number>();
  let total = 0;

  for (const doc of docs) {
    const terms = tokenize(doc.text);
    lengths.set(doc.id, terms.length);
    total += terms.length;

    const counts = new Map<string, number>();
    for (const term of terms) counts.set(term, (counts.get(term) ?? 0) + 1);
    for (const [term, tf] of counts) {
      const list = postings.get(term);
      if (list) list.push({ chunkId: doc.id, tf });
      else postings.set(term, [{ chunkId: doc.id, tf }]);
    }
  }

  return {
    postings,
    lengths,
    avgLength: docs.length ? total / docs.length : 0,
    size: docs.length,
  };
}

/** Okapi BM25 scores for a free-text query, highest first. */
export function bm25Search(
  index: Bm25Index,
  query: string,
  options: { limit: number; allow?: Set<string> },
): Array<{ chunkId: string; score: number }> {
  const terms = tokenize(query);
  if (!terms.length || !index.size) return [];

  const scores = new Map<string, number>();
  const seen = new Set<string>();

  for (const term of terms) {
    if (seen.has(term)) continue;
    seen.add(term);
    const list = index.postings.get(term);
    if (!list) continue;

    const df = list.length;
    const idf = Math.log(1 + (index.size - df + 0.5) / (df + 0.5));

    for (const { chunkId, tf } of list) {
      if (options.allow && !options.allow.has(chunkId)) continue;
      const length = index.lengths.get(chunkId) ?? index.avgLength;
      const norm = tf + K1 * (1 - B + (B * length) / (index.avgLength || 1));
      scores.set(chunkId, (scores.get(chunkId) ?? 0) + (idf * tf * (K1 + 1)) / norm);
    }
  }

  return [...scores.entries()]
    .map(([chunkId, score]) => ({ chunkId, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit);
}
