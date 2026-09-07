import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-face", display: "swap" });

export const metadata: Metadata = {
  title: "DocuChat — chat with your documents, entirely in the browser",
  description:
    "Upload a PDF or DOCX and ask questions about it. Parsing, chunking, embedding and vector search all run client-side; only your own API key ever leaves the page.",
  applicationName: "DocuChat",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "DocuChat — client-side document RAG",
    description:
      "A retrieval-augmented document chat with no backend: hybrid BM25 + on-device embeddings, vectors in IndexedDB, your API key stays in your browser.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#07070a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="app-ambient font-sans antialiased">{children}</body>
    </html>
  );
}
