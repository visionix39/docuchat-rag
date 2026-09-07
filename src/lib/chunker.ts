export interface ChunkSpec {
  text: string;
  charStart: number;
  charEnd: number;
}

interface Segment {
  text: string;
  start: number;
}

/** Split on a regex while keeping the character offset of every piece. */
function splitWithOffsets(text: string, start: number, pattern: RegExp): Segment[] {
  const out: Segment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const end = (match.index ?? 0) + match[0].length;
    const piece = text.slice(cursor, end);
    if (piece.trim()) out.push({ text: piece, start: start + cursor });
    cursor = end;
  }
  const tail = text.slice(cursor);
  if (tail.trim()) out.push({ text: tail, start: start + cursor });
  return out;
}

function hardSlice(segment: Segment, size: number): Segment[] {
  const out: Segment[] = [];
  for (let i = 0; i < segment.text.length; i += size) {
    out.push({ text: segment.text.slice(i, i + size), start: segment.start + i });
  }
  return out;
}

/**
 * Recursive character splitting: prefer paragraph breaks, then sentence
 * boundaries, then a hard cut. Offsets stay faithful to the source string so
 * citations can point at real page numbers.
 */
function segmentize(text: string, size: number): Segment[] {
  const paragraphs = splitWithOffsets(text, 0, /\n{2,}/g);
  const out: Segment[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.text.length <= size) {
      out.push(paragraph);
      continue;
    }
    const sentences = splitWithOffsets(paragraph.text, paragraph.start, /[.!?](?=\s)|\n/g);
    for (const sentence of sentences) {
      if (sentence.text.length <= size) out.push(sentence);
      else out.push(...hardSlice(sentence, size));
    }
  }

  return out;
}

export function chunkText(
  text: string,
  { size = 1100, overlap = 180 }: { size?: number; overlap?: number } = {},
): ChunkSpec[] {
  if (!text.trim()) return [];

  const effectiveOverlap = Math.min(overlap, Math.floor(size / 2));
  const segments = segmentize(text, size);
  const chunks: ChunkSpec[] = [];

  let current: Segment[] = [];
  let length = 0;

  /**
   * Emits the accumulated segments as one chunk and returns the overlap that
   * should seed the next one. Overlap is measured in characters, not segments
   * — a single paragraph is usually longer than the overlap budget, so
   * carrying whole segments forward would silently produce no overlap at all.
   */
  const flush = (): Segment | null => {
    if (!current.length) return null;

    const last = current[current.length - 1];
    const charStart = current[0].start;
    const charEnd = last.start + last.text.length;

    chunks.push({ text: text.slice(charStart, charEnd).trim(), charStart, charEnd });

    if (effectiveOverlap <= 0) return null;

    let tailStart = Math.max(charStart, charEnd - effectiveOverlap);
    // Nudge forward past a half-word so the overlap starts cleanly.
    const boundary = text.slice(tailStart, charEnd).search(/\s/);
    if (boundary > 0) tailStart += boundary + 1;

    if (tailStart <= charStart || tailStart >= charEnd) return null;
    return { text: text.slice(tailStart, charEnd), start: tailStart };
  };

  for (const segment of segments) {
    if (length + segment.text.length > size && current.length) {
      const carry = flush();
      current = carry ? [carry] : [];
      length = carry?.text.length ?? 0;
    }

    current.push(segment);
    length += segment.text.length;
  }

  flush();
  return chunks.filter((chunk) => chunk.text.length > 24);
}
