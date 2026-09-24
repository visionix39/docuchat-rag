import Anthropic from "@anthropic-ai/sdk";
import { resolveChatModel } from "../models";
import type { Completion, ModelProbe } from "./types";

const MAX_TOKENS = 16_000;
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

/**
 * The key lives in the visitor's own browser and talks straight to
 * api.anthropic.com — which is exactly what `dangerouslyAllowBrowser` exists
 * for. It would be genuinely dangerous in a multi-tenant app with a shared
 * key; here there is no server to hold one.
 */
export const streamAnthropic: Completion = async function* ({
  apiKey,
  model,
  system,
  turns,
  temperature,
  effort,
  showReasoning,
  signal,
}) {
  const spec = resolveChatModel("anthropic", model);
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 });

  const thinking =
    spec.thinking === "adaptive"
      ? ({ type: "adaptive", display: showReasoning ? "summarized" : "omitted" } as const)
      : undefined;

  const stream = client.beta.messages.stream(
    {
      model,
      max_tokens: MAX_TOKENS,
      system,
      messages: turns,
      ...(thinking ? { thinking } : {}),
      ...(spec.thinking === "adaptive" ? { output_config: { effort } } : {}),
      ...(spec.supportsTemperature ? { temperature } : {}),
      ...(spec.serverFallbacks ? { betas: [FALLBACK_BETA], fallbacks: "default" as const } : {}),
    },
    { signal },
  );

  for await (const event of stream) {
    if (event.type !== "content_block_delta") continue;
    if (event.delta.type === "text_delta") yield { type: "text", text: event.delta.text };
    else if (event.delta.type === "thinking_delta" && event.delta.thinking) {
      yield { type: "reasoning", text: event.delta.thinking };
    }
  }

  const final = await stream.finalMessage();

  // A refusal is an HTTP 200 with no usable content — surface it, don't render
  // an empty bubble. With server-side fallbacks on, reaching here means the
  // whole chain declined.
  if (final.stop_reason === "refusal") {
    yield {
      type: "refusal",
      explanation:
        final.stop_details && "explanation" in final.stop_details
          ? String(final.stop_details.explanation ?? "")
          : "",
    };
  }

  yield {
    type: "usage",
    input: final.usage.input_tokens ?? 0,
    output: final.usage.output_tokens ?? 0,
  };
};

export const probeAnthropic: ModelProbe = async ({ apiKey, signal }) => {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 0 });
  const page = await client.models.list({ limit: 100 }, { signal });
  return page.data.map((model) => ({ id: model.id, label: model.display_name || model.id }));
};
