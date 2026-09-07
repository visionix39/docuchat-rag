const STOPWORDS = new Set(
  `a about above after again against all am an and any are aren't as at be because been before being
   below between both but by can cannot could couldn't did didn't do does doesn't doing don't down during
   each few for from further had hadn't has hasn't have haven't having he her here hers herself him himself
   his how i if in into is isn't it its itself let's me more most mustn't my myself no nor not of off on once
   only or other ought our ours ourselves out over own same shan't she should shouldn't so some such than that
   the their theirs them themselves then there these they this those through to too under until up very was
   wasn't we were weren't what when where which while who whom why with won't would wouldn't you your yours
   yourself yourselves`
    .split(/\s+/)
    .filter(Boolean),
);

/**
 * Cheap, dependency-free suffix stripping. Not a real Porter stemmer — just
 * enough to make "reporting" and "reports" collide in the keyword index.
 */
function stem(word: string): string {
  if (word.length < 5) return word;
  for (const suffix of ["ational", "iveness", "fulness", "ousness", "ization", "ations", "ingly", "edly", "ment", "ness", "tion", "ing", "ies", "ed", "es", "s"]) {
    if (word.length > suffix.length + 2 && word.endsWith(suffix)) {
      const base = word.slice(0, -suffix.length);
      if (suffix === "ies") return `${base}y`;
      if (suffix === "ization") return `${base}ize`;
      if (suffix === "tion" || suffix === "ation" || suffix === "ations") return `${base}t`;
      return base;
    }
  }
  return word;
}

export function tokenize(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  const out: string[] = [];
  for (const raw of normalized.split(/[^a-z0-9+#.]+/)) {
    if (!raw) continue;
    const word = raw.replace(/^\.+|\.+$/g, "");
    if (word.length < 2 || word.length > 40) continue;
    if (STOPWORDS.has(word)) continue;
    out.push(stem(word));
  }
  return out;
}

/** Rough token estimate — good enough for context budgeting and cost display. */
export const estimateTokens = (text: string) => Math.ceil(text.length / 4);
