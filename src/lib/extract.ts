export interface ExtractedText {
  text: string;
  /** Character offset at which each page begins (empty for page-less formats). */
  pageOffsets: number[];
  pages?: number;
}

const TEXT_EXTENSIONS = [".txt", ".md", ".markdown", ".csv", ".tsv", ".json", ".log", ".rtf"];

export function isSupported(file: File): boolean {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return true;
  if (name.endsWith(".docx")) return true;
  if (file.type.startsWith("text/")) return true;
  return TEXT_EXTENSIONS.some((extension) => name.endsWith(extension));
}

export const SUPPORTED_LABEL = "PDF, DOCX, TXT, MD, CSV, JSON";

function tidy(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\u00ad/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function extractPdf(file: File, onProgress?: (ratio: number) => void): Promise<ExtractedText> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({
    data,
    cMapUrl: "/pdf-cmaps/",
    cMapPacked: true,
    wasmUrl: "/pdf-wasm/",
  }).promise;
  const numPages = pdf.numPages;

  const parts: string[] = [];
  const pageOffsets: number[] = [];
  let offset = 0;

  for (let pageNumber = 1; pageNumber <= numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    let pageText = "";
    for (const item of content.items) {
      if (!("str" in item)) continue;
      pageText += item.str;
      if (item.hasEOL) pageText += "\n";
      else if (item.str && !item.str.endsWith(" ")) pageText += " ";
    }
    page.cleanup();

    // Join hyphenated words broken across lines before normalising whitespace.
    pageText = tidy(pageText.replace(/(\w)-\n(\w)/g, "$1$2"));

    pageOffsets.push(offset);
    parts.push(pageText);
    offset += pageText.length + 2; // the "\n\n" we join pages with
    onProgress?.(pageNumber / numPages);
  }

  await pdf.destroy();
  return { text: parts.join("\n\n"), pageOffsets, pages: numPages };
}

async function extractDocx(file: File): Promise<ExtractedText> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return { text: tidy(value), pageOffsets: [] };
}

export async function extractFile(
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<ExtractedText> {
  const name = file.name.toLowerCase();

  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    return extractPdf(file, onProgress);
  }
  if (name.endsWith(".docx")) {
    onProgress?.(0.5);
    return extractDocx(file);
  }

  onProgress?.(0.5);
  const raw = await file.text();
  if (name.endsWith(".json")) {
    try {
      return { text: tidy(JSON.stringify(JSON.parse(raw), null, 2)), pageOffsets: [] };
    } catch {
      // Fall through to raw text for malformed JSON.
    }
  }
  return { text: tidy(raw), pageOffsets: [] };
}

/** 1-indexed page for a character offset, or undefined when pages are unknown. */
export function pageForOffset(pageOffsets: number[], offset: number): number | undefined {
  if (!pageOffsets.length) return undefined;
  let low = 0;
  let high = pageOffsets.length - 1;
  let answer = 0;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (pageOffsets[mid] <= offset) {
      answer = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return answer + 1;
}
