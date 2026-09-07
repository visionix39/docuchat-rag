/**
 * pdf.js loads its worker, character maps and codec wasm by URL at runtime.
 * Bundlers can't fingerprint those, so we copy them into /public and reference
 * them as stable absolute paths — which also keeps the app fully self-hosted
 * instead of reaching for a third-party CDN.
 */
import { cpSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = join(root, "node_modules/pdfjs-dist");

if (!existsSync(pkg)) {
  console.error("[pdf-assets] pdfjs-dist not found — run npm install first.");
  process.exit(1);
}

const worker = ["build/pdf.worker.min.mjs", "build/pdf.worker.mjs"]
  .map((path) => join(pkg, path))
  .find(existsSync);

if (!worker) {
  console.error("[pdf-assets] no pdf.worker build found in pdfjs-dist.");
  process.exit(1);
}

mkdirSync(join(root, "public"), { recursive: true });
copyFileSync(worker, join(root, "public/pdf.worker.min.mjs"));

// Character maps let text extraction work on PDFs that use predefined CMaps
// (most CJK documents); the wasm bundle backs pdf.js's image codecs.
for (const dir of ["cmaps", "wasm"]) {
  const from = join(pkg, dir);
  if (existsSync(from)) cpSync(from, join(root, `public/pdf-${dir}`), { recursive: true });
}

console.log("[pdf-assets] worker, cmaps and wasm copied into public/");
