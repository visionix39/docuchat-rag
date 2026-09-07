import type { NextConfig } from "next";

/**
 * Static export: `next build` emits a plain folder of HTML/JS/CSS into `out/`.
 * Vercel serves it from the edge CDN with zero serverless functions, which is
 * what makes this app free to host — every moving part (parsing, embedding,
 * vector search, LLM calls) runs in the visitor's browser.
 */
const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  images: { unoptimized: true },
  webpack: (config) => {
    // transformers.js ships optional Node-only backends; stub them for the browser.
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-node": false,
      sharp: false,
    };
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false, crypto: false };
    return config;
  },
};

export default nextConfig;
