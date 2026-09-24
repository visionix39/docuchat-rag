import type { Completion, ModelProbe } from "./types";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

interface GeminiPart {
  text?: string;
  thought?: boolean;
}

interface GeminiChunk {
  candidates?: Array<{ content?: { parts?: GeminiPart[] }; finishReason?: string }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { message?: string; status?: string };
}

/**
 * The key goes in the `x-goog-api-key` header rather than the `?key=` query
 * parameter Google's quickstarts use — a query string ends up in logs,
 * referrers and history, which is the wrong place for a credential.
 */
const authHeaders = (apiKey: string) => ({ "x-goog-api-key": apiKey });

async function failure(response: Response): Promise<Error> {
  const body = await response.text().catch(() => "");
  let detail = body.slice(0, 300);
  try {
    const parsed = JSON.parse(body) as GeminiChunk;
    if (parsed.error?.message) detail = parsed.error.message;
  } catch {
    /* non-JSON error body — use the raw text */
  }
  return new Error(`${response.status} ${response.statusText}${detail ? ` — ${detail}` : ""}`);
}

export const streamGoogle: Completion = async function* ({
  apiKey,
  model,
  system,
  turns,
  temperature,
  showReasoning,
  signal,
}) {
  const name = model.startsWith("models/") ? model.slice(7) : model;
  const wantsThoughts = showReasoning && /^gemini-2\.5|^gemini-[3-9]/.test(name);

  const response = await fetch(`${BASE}/models/${name}:streamGenerateContent?alt=sse`, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", ...authHeaders(apiKey) },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: turns.map((turn) => ({
        // Gemini calls the assistant "model"; everything else maps 1:1.
        role: turn.role === "assistant" ? "model" : "user",
        parts: [{ text: turn.content }],
      })),
      generationConfig: {
        temperature,
        maxOutputTokens: 16_000,
        ...(wantsThoughts ? { thinkingConfig: { includeThoughts: true } } : {}),
      },
    }),
  });

  if (!response.ok || !response.body) throw await failure(response);

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let input = 0;
  let output = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;

      let parsed: GeminiChunk;
      try {
        parsed = JSON.parse(payload) as GeminiChunk;
      } catch {
        continue;
      }

      if (parsed.error?.message) throw new Error(parsed.error.message);

      for (const part of parsed.candidates?.[0]?.content?.parts ?? []) {
        if (!part.text) continue;
        yield part.thought ? { type: "reasoning", text: part.text } : { type: "text", text: part.text };
      }

      if (parsed.usageMetadata) {
        input = parsed.usageMetadata.promptTokenCount ?? input;
        output = parsed.usageMetadata.candidatesTokenCount ?? output;
      }
    }
  }

  yield { type: "usage", input, output };
};

export const probeGoogle: ModelProbe = async ({ apiKey, signal }) => {
  const response = await fetch(`${BASE}/models?pageSize=200`, {
    headers: authHeaders(apiKey),
    signal,
  });
  if (!response.ok) throw await failure(response);

  const body = (await response.json()) as {
    models?: Array<{ name: string; displayName?: string; supportedGenerationMethods?: string[] }>;
  };

  return (body.models ?? [])
    .filter((entry) => entry.supportedGenerationMethods?.includes("generateContent"))
    .map((entry) => ({
      id: entry.name.replace(/^models\//, ""),
      label: entry.displayName ?? entry.name.replace(/^models\//, ""),
    }))
    .filter((entry) => !/embedding|aqa|imagen|veo|tts/i.test(entry.id));
};
