import type { ProviderId } from "../types";
import { probeAnthropic, streamAnthropic } from "./anthropic";
import { probeGoogle, streamGoogle } from "./google";
import { probeOpenAI, streamOpenAI } from "./openai";
import type { Completion, ModelProbe } from "./types";

export const completions: Record<ProviderId, Completion> = {
  anthropic: streamAnthropic,
  openai: streamOpenAI,
  google: streamGoogle,
};

export const probes: Record<ProviderId, ModelProbe> = {
  anthropic: probeAnthropic,
  openai: probeOpenAI,
  google: probeGoogle,
};

export { describeError } from "./types";
export type { ChatTurn, CompletionRequest, ModelProbe, StreamEvent } from "./types";
