# DocuChat — client-side document RAG

Upload a PDF, DOCX or text file and ask questions about it. Parsing, chunking, embedding, vector
storage and retrieval all happen **inside the browser tab**. There is no backend, no vector database
and nothing to pay for besides your own model API key.

Deploys to Vercel as a pure static site — `next build` emits a folder of HTML/JS/CSS and Vercel
serves it from the CDN. Zero serverless functions, so it runs comfortably on the free tier and needs
no Railway/Render/Fly companion service.

---

## How it works

```
File ──► extract ──► chunk ──► embed ──────► IndexedDB
         pdf.js     recursive  MiniLM in a   (text + Float32 vectors)
         mammoth    splitter   Web Worker
                                                  │
Question ──► expand ──► embed query ──► hybrid search ──► top-K passages
                                        BM25 + cosine
                                        fused with RRF,
                                        de-duped with MMR
                                                  │
                                                  ▼
                            your API key ──► Claude / OpenAI-compatible
                                                  │
                                                  ▼
                                  streamed answer + clickable citations
```

**Extraction** — `pdfjs-dist` reads PDFs in its own worker, keeping a per-page character offset map
so a citation can say "page 14" and mean it. `mammoth` handles DOCX; text, Markdown, CSV and JSON
are read directly. Hyphenated line breaks are rejoined and soft hyphens stripped before indexing.

**Chunking** — recursive character splitting that prefers paragraph breaks, falls back to sentence
boundaries, and only then cuts mid-sentence. Overlap is applied in characters (aligned to a word
boundary) so a fact that straddles a boundary is still retrievable from a single chunk.

**Embedding** — a sentence-transformer runs on-device through
[transformers.js](https://github.com/huggingface/transformers.js) in a dedicated Web Worker, so the
UI never blocks. The default is quantised `all-MiniLM-L6-v2` on WASM (~23 MB, cached by the browser
after first load). WebGPU is available as an opt-in: much faster per chunk, but it needs
full-precision weights and therefore ~4x the download.

**Storage** — documents, chunks and `Float32Array` vectors are persisted in IndexedDB via `idb`.
Reload the tab and the library is still there. Nothing is uploaded anywhere.

**Retrieval** — three strategies:

| Mode | What it does | Good for |
|---|---|---|
| `hybrid` (default) | BM25 and cosine rankings fused with Reciprocal Rank Fusion, then MMR to drop near-duplicates | almost everything |
| `semantic` | dense vectors only | paraphrased, conceptual questions |
| `keyword` | Okapi BM25 only — no model download at all | exact names, IDs, rare acronyms; low-bandwidth |

BM25 is a real implementation (k1 = 1.5, b = 0.75) over a tokenizer that folds diacritics, drops
stopwords and does light suffix stripping. If a document has no vectors, retrieval degrades to
keyword search automatically instead of returning nothing.

**Generation** — the retrieved passages are numbered and placed in the prompt, and the model is
instructed to cite them as `[1]`, `[2]`. Those markers become clickable chips; clicking one opens a
drawer with the *verbatim* chunk that was in context, so every claim is auditable. Strict grounding
(on by default) forbids answering from general knowledge and requires the model to say when the
answer isn't in the document.

---

## Privacy model

Worth being precise, because "client-side" gets used loosely:

- **Never leaves your browser:** the file itself, its full text, all chunks, all vectors.
- **Leaves your browser:** the handful of retrieved passages plus your question, sent directly from
  the page to the model provider with your API key. Nothing passes through any server of ours —
  there isn't one.
- **The API key** is held in memory for the tab's lifetime by default. The "remember this key"
  toggle stores it in `localStorage`, which is convenient on your own machine and a bad idea on a
  shared one. The app never transmits the key anywhere except the provider you selected.
- **Model weights** are fetched from the Hugging Face CDN on first use and cached by the browser.

Anthropic requests use the official SDK with `dangerouslyAllowBrowser: true`. That flag exists to
stop people shipping a *shared* server key to every visitor; here the key is the visitor's own and
there is no server to keep it on, which is exactly the case the flag is meant for.

---

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, press <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>K</kbd>, paste an API key,
and drop a file anywhere on the page.

```bash
npm run build      # static export into ./out
npm start          # serve ./out locally
npm run typecheck
```

## Deploying to Vercel

Import the repository and accept the defaults — `vercel.json` already sets the build command and
`out` as the output directory. Or from the CLI:

```bash
npx vercel deploy --prod
```

No environment variables. No functions. Nothing to provision. If the repository root is the parent
folder rather than this one, set the Vercel project's **Root Directory** to `docuchat-rag`.

## Models

Chat models are listed in [`src/lib/models.ts`](src/lib/models.ts) with per-million-token pricing
used for the in-app cost estimate. Anthropic frontier models run with adaptive thinking and an
`effort` control, and reject a `temperature` parameter — so the slider is hidden for them rather
than sent and rejected. Claude Opus 5 requests opt into server-side refusal fallbacks, and a refusal
is rendered as a clear message instead of an empty bubble.

The OpenAI path targets any OpenAI-compatible `/chat/completions` endpoint — OpenAI, Groq, Together,
OpenRouter, or a local server. The endpoint must send permissive CORS headers to be callable from a
browser; most hosted ones do, many self-hosted ones need a flag.

## Known limits

- **Scanned PDFs** have no text layer. Extraction fails with an explicit message rather than
  indexing an empty document; OCR would need Tesseract-wasm and is not wired up.
- **Very large libraries.** Cosine similarity is a linear scan over every chunk in scope. That is
  fast into the low tens of thousands of chunks; beyond that it wants an ANN index (HNSW in wasm).
- **Cross-document synthesis** is only as good as top-K allows. Raise the passage count in Settings
  for questions that span several documents.
- **Safari** runs the WASM path only, and IndexedDB quotas are tighter than in Chromium.

## Project layout

```
src/
  app/                 Next.js app router shell (one static page)
  components/          UI — sidebar, chat, settings, source drawer
  lib/
    extract.ts         PDF/DOCX/text → text + page offsets
    chunker.ts         recursive splitter with character-level overlap
    tokenize.ts        normalisation, stopwords, light stemming
    bm25.ts            Okapi BM25 index and search
    vectors.ts         cosine, normalisation, MMR
    retriever.ts       RRF fusion, MMR selection, query expansion
    embedder.ts        typed proxy to the embedding worker
    idb.ts             IndexedDB persistence
    prompt.ts          system prompts, numbered context, citations
    providers/         Anthropic SDK + OpenAI-compatible SSE
    store.ts           zustand store: ingest and ask pipelines
  workers/
    embed.worker.ts    transformers.js feature extraction off the main thread
```
