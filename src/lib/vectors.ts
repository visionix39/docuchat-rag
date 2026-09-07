/** Dot product. Embeddings are L2-normalised at creation, so this is cosine. */
export function dot(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) sum += a[i] * b[i];
  return sum;
}

export function normalize(vector: Float32Array): Float32Array {
  let sum = 0;
  for (let i = 0; i < vector.length; i += 1) sum += vector[i] * vector[i];
  const norm = Math.sqrt(sum) || 1;
  const out = new Float32Array(vector.length);
  for (let i = 0; i < vector.length; i += 1) out[i] = vector[i] / norm;
  return out;
}

/**
 * Maximal Marginal Relevance: greedily pick items that are relevant to the
 * query but unlike what has already been picked, so the context window isn't
 * spent on three paraphrases of the same paragraph.
 */
export function mmrSelect<T>(
  items: T[],
  count: number,
  relevance: (item: T) => number,
  vectorOf: (item: T) => Float32Array | undefined,
  lambda = 0.72,
): T[] {
  if (items.length <= count) return [...items];

  const pool = [...items];
  const picked: T[] = [];

  while (picked.length < count && pool.length) {
    let bestIndex = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < pool.length; i += 1) {
      const candidate = pool[i];
      const candidateVector = vectorOf(candidate);
      let maxSimilarity = 0;

      if (candidateVector) {
        for (const chosen of picked) {
          const chosenVector = vectorOf(chosen);
          if (chosenVector) maxSimilarity = Math.max(maxSimilarity, dot(candidateVector, chosenVector));
        }
      }

      const score = lambda * relevance(candidate) - (1 - lambda) * maxSimilarity;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    picked.push(pool.splice(bestIndex, 1)[0]);
  }

  return picked;
}
