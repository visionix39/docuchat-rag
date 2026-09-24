import type { Completion, ModelProbe } from "./types";

interface ChoiceDelta {
  choices?: Array<{ delta?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
}

/**
 * Raw SSE against any OpenAI-compatible /chat/completions endpoint, so the
 * same code path covers OpenAI, Groq, Together, OpenRouter and local servers.
 */
const normalizeBase = (baseUrl?: string) =>
  (baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");

export const streamOpenAI: Completion = async function* ({
  apiKey,
  model,
  system,
  turns,
  temperature,
  baseUrl,
  signal,
}) {
  const endpoint = `${normalizeBase(baseUrl)}/chat/completions`;

  const response = await fetch(endpoint, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      stream: true,
      stream_options: { include_usage: true },
      messages: [{ role: "system", content: system }, ...turns],
    }),
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(`${response.status} ${response.statusText}${detail ? ` — ${detail.slice(0, 300)}` : ""}`);
  }

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
      if (!payload || payload === "[DONE]") continue;

      let parsed: ChoiceDelta;
      try {
        parsed = JSON.parse(payload) as ChoiceDelta;
      } catch {
        continue;
      }

      const text = parsed.choices?.[0]?.delta?.content;
      if (text) yield { type: "text", text };
      if (parsed.usage) {
        input = parsed.usage.prompt_tokens ?? input;
        output = parsed.usage.completion_tokens ?? output;
      }
    }
  }

  yield { type: "usage", input, output };
};

export const probeOpenAI: ModelProbe = async ({ apiKey, baseUrl, signal }) => {
  const response = await fetch(`${normalizeBase(baseUrl)}/models`, {
    headers: { authorization: `Bearer ${apiKey}` },
    signal,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `${response.status} ${response.statusText}${detail ? ` — ${detail.slice(0, 300)}` : ""}`,
    );
  }

  const body = (await response.json()) as { data?: Array<{ id: string }> };
  return (body.data ?? [])
    .map((entry) => ({ id: entry.id, label: entry.id }))
    // Chat-completions endpoints also list embedding, audio and image models.
    .filter((entry) => !/embedding|whisper|tts|dall-e|moderation|image|audio|realtime/i.test(entry.id))
    .sort((a, b) => a.id.localeCompare(b.id));
};
