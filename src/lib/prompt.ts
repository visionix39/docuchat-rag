import type { ScoredChunk } from "./retriever";
import type { Citation, DocMeta } from "./types";
import { estimateTokens } from "./tokenize";

export const SYSTEM_PROMPT_STRICT = `You are a document analyst. Answer only from the numbered excerpts supplied in each question.

Rules:
- Cite every factual claim with the excerpt number in square brackets, like [2]. Cite multiple as [1][3].
- If the excerpts do not contain the answer, say so plainly and name what is missing. Never fill the gap from general knowledge.
- Quote exact figures, names and dates as they appear. Do not round or paraphrase numbers.
- When excerpts disagree, surface the disagreement instead of picking a side.
- Be direct and concise. Use short markdown sections or bullets when the answer has parts; skip preamble.`;

export const SYSTEM_PROMPT_OPEN = `You are a document analyst. Answer using the numbered excerpts supplied in each question, and cite them with bracketed numbers like [2].

You may add clearly-labelled general knowledge when the excerpts fall short — prefix such sentences with "Beyond the document:" so the reader can tell the two apart. Quote figures, names and dates exactly as written. Be direct and concise.`;

/** Renders retrieved chunks into a numbered context block plus citation records. */
export function buildContext(
  results: ScoredChunk[],
  docs: Map<string, DocMeta>,
): { block: string; citations: Citation[]; tokens: number } {
  const citations: Citation[] = [];
  const parts: string[] = [];

  results.forEach((result, index) => {
    const n = index + 1;
    const doc = docs.get(result.chunk.docId);
    const name = doc?.name ?? "document";
    const location = result.chunk.page ? `page ${result.chunk.page}` : `part ${result.chunk.index + 1}`;

    citations.push({
      n,
      chunkId: result.chunk.id,
      docId: result.chunk.docId,
      docName: name,
      page: result.chunk.page,
      text: result.chunk.text,
      score: result.score,
    });

    parts.push(`[${n}] ${name} — ${location}\n${result.chunk.text}`);
  });

  const block = parts.join("\n\n---\n\n");
  return { block, citations, tokens: estimateTokens(block) };
}

export function buildUserTurn(question: string, contextBlock: string): string {
  if (!contextBlock) {
    return `No excerpts were retrieved for this question.\n\nQuestion: ${question}`;
  }
  return `Excerpts from the user's documents:\n\n${contextBlock}\n\n---\n\nQuestion: ${question}`;
}

/** Question starters derived from the document itself — no API call needed. */
export function suggestQuestions(docs: DocMeta[], sampleText: string): string[] {
  const name = docs[0]?.name.replace(/\.[a-z0-9]+$/i, "") ?? "this document";
  const suggestions = [
    `Summarise ${name} in five bullet points.`,
    "What are the key dates, figures and named parties?",
    "What obligations or action items does this create, and for whom?",
  ];

  const headingMatch = sampleText.match(/^#{1,3}\s+(.{6,70})$/m);
  if (headingMatch) suggestions.push(`Explain the section on ${headingMatch[1].trim()}.`);
  else suggestions.push("What does this document leave unanswered or ambiguous?");

  if (docs.length > 1) suggestions.push("Where do these documents agree and disagree?");
  return suggestions.slice(0, 4);
}
