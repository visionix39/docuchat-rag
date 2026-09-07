import type { ProviderId } from "../types";
import { streamAnthropic } from "./anthropic";
import { streamOpenAI } from "./openai";
import type { Completion } from "./types";

export const completions: Record<ProviderId, Completion> = {
  anthropic: streamAnthropic,
  openai: streamOpenAI,
};

export { describeError } from "./types";
export type { ChatTurn, CompletionRequest, StreamEvent } from "./types";
