"use client";

import { Eye, EyeOff, ExternalLink, ShieldAlert, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass, Segmented, Slider, Switch } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { CHAT_MODELS, EMBEDDING_MODELS, findChatModel, findEmbeddingModel } from "@/lib/models";
import { useStore } from "@/lib/store";
import type { ProviderId } from "@/lib/types";

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="mb-3 mt-1 text-[11px] font-semibold uppercase tracking-wider text-mist-500">
      {children}
    </h3>
  );
}

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useStore((state) => state.settings);
  const setSettings = useStore((state) => state.setSettings);
  const clearLibrary = useStore((state) => state.clearLibrary);
  const clearChat = useStore((state) => state.clearChat);
  const docCount = useStore((state) => state.docs.length);
  const notify = useStore((state) => state.notify);

  const [revealKey, setRevealKey] = useState(false);
  const model = findChatModel(
    settings.provider === "anthropic" ? settings.anthropicModel : settings.openaiModel,
  );
  const isAnthropic = settings.provider === "anthropic";
  const providerModels = CHAT_MODELS.filter((entry) => entry.provider === settings.provider);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Settings"
      subtitle="Everything here stays on this device"
      width="max-w-xl"
    >
      <div className="space-y-8">
        <section>
          <SectionTitle>Model</SectionTitle>
          <div className="space-y-4">
            <Field label="Provider">
              <Segmented<ProviderId>
                value={settings.provider}
                onChange={(provider) => setSettings({ provider })}
                options={[
                  { value: "anthropic", label: "Anthropic" },
                  { value: "openai", label: "OpenAI-compatible" },
                ]}
              />
            </Field>

            <Field
              label="API key"
              hint={
                <span className="inline-flex flex-wrap items-center gap-1">
                  Sent directly from your browser to{" "}
                  {isAnthropic ? "api.anthropic.com" : "your chosen endpoint"} — never to any server
                  of ours.
                  <a
                    href={
                      isAnthropic
                        ? "https://console.anthropic.com/settings/keys"
                        : "https://platform.openai.com/api-keys"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-aqua-400 hover:underline"
                  >
                    Get a key <ExternalLink className="h-3 w-3" />
                  </a>
                </span>
              }
              action={
                <button
                  type="button"
                  onClick={() => setRevealKey((value) => !value)}
                  className="focus-ring inline-flex items-center gap-1 rounded px-1 text-[11px] text-mist-500 hover:text-mist-200"
                >
                  {revealKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {revealKey ? "Hide" : "Show"}
                </button>
              }
            >
              <input
                type={revealKey ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                className={`${inputClass} font-mono text-[13px]`}
                placeholder={isAnthropic ? "sk-ant-…" : "sk-…"}
                value={isAnthropic ? settings.anthropicKey : settings.openaiKey}
                onChange={(event) =>
                  setSettings(
                    isAnthropic
                      ? { anthropicKey: event.target.value }
                      : { openaiKey: event.target.value },
                  )
                }
              />
            </Field>

            <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3">
              <Switch
                checked={settings.persistKeys}
                onChange={(persistKeys) => setSettings({ persistKeys })}
                label="Remember this key across reloads"
                hint="Stores it in this browser's localStorage. Convenient on your own machine; leave it off on a shared one — the key then lives in memory only and clears when the tab closes."
              />
            </div>

            <Field label="Model">
              <select
                className={inputClass}
                value={isAnthropic ? settings.anthropicModel : settings.openaiModel}
                onChange={(event) =>
                  setSettings(
                    isAnthropic
                      ? { anthropicModel: event.target.value }
                      : { openaiModel: event.target.value },
                  )
                }
              >
                {providerModels.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label} — {entry.contextLabel}
                    {entry.inputPerMTok
                      ? ` · $${entry.inputPerMTok}/$${entry.outputPerMTok} per Mtok`
                      : ""}
                  </option>
                ))}
              </select>
            </Field>

            {!isAnthropic ? (
              <Field
                label="Base URL"
                hint="Any OpenAI-compatible /chat/completions endpoint — OpenAI, Groq, Together, OpenRouter, or a local server. The endpoint must send permissive CORS headers to be callable from a browser."
              >
                <input
                  className={`${inputClass} font-mono text-[13px]`}
                  value={settings.openaiBaseUrl}
                  onChange={(event) => setSettings({ openaiBaseUrl: event.target.value })}
                />
              </Field>
            ) : null}

            {model?.thinking === "adaptive" ? (
              <>
                <Field
                  label="Reasoning effort"
                  hint="How much thinking the model spends before answering. Medium suits most document questions; high pays off on cross-document synthesis."
                >
                  <Segmented
                    value={settings.effort}
                    onChange={(effort) => setSettings({ effort })}
                    options={[
                      { value: "low" as const, label: "low" },
                      { value: "medium" as const, label: "medium" },
                      { value: "high" as const, label: "high" },
                    ]}
                  />
                </Field>
                <Switch
                  checked={settings.showReasoning}
                  onChange={(showReasoning) => setSettings({ showReasoning })}
                  label="Show reasoning summary"
                  hint="Streams a readable summary of the model's reasoning above each answer."
                />
              </>
            ) : null}

            {model?.supportsTemperature ? (
              <Field
                label={`Temperature — ${settings.temperature.toFixed(2)}`}
                hint="Low values keep answers close to the source text."
              >
                <Slider
                  value={settings.temperature}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(temperature) => setSettings({ temperature })}
                />
              </Field>
            ) : null}

            <Switch
              checked={settings.strictGrounding}
              onChange={(strictGrounding) => setSettings({ strictGrounding })}
              label="Strict grounding"
              hint="Confines the model to the retrieved excerpts and makes it say when the answer isn't there. Turn off to let it add clearly-labelled general knowledge."
            />
          </div>
        </section>

        <section>
          <SectionTitle>Retrieval</SectionTitle>
          <div className="space-y-4">
            <Field
              label="Search strategy"
              hint="Hybrid fuses keyword (BM25) and vector rankings with reciprocal rank fusion — it catches both paraphrases and exact identifiers. Pure keyword needs no model download."
            >
              <Segmented
                value={settings.retrievalMode}
                onChange={(retrievalMode) => setSettings({ retrievalMode })}
                options={[
                  { value: "hybrid" as const, label: "hybrid" },
                  { value: "semantic" as const, label: "semantic" },
                  { value: "keyword" as const, label: "keyword" },
                ]}
              />
            </Field>

            <Field
              label={`Passages per answer — ${settings.topK}`}
              hint="More passages means better recall and a larger prompt. Six is a good default."
            >
              <Slider
                value={settings.topK}
                min={2}
                max={14}
                onChange={(topK) => setSettings({ topK })}
              />
            </Field>
          </div>
        </section>

        <section>
          <SectionTitle>Indexing</SectionTitle>
          <div className="space-y-4">
            <Field
              label="Embeddings"
              hint="Local runs a small sentence-transformer in a Web Worker, cached by the browser after first download. Off skips it entirely and relies on keyword search."
            >
              <Segmented
                value={settings.embeddingMode}
                onChange={(embeddingMode) => setSettings({ embeddingMode })}
                options={[
                  { value: "local" as const, label: "on-device" },
                  { value: "none" as const, label: "off" },
                ]}
              />
            </Field>

            {settings.embeddingMode === "local" ? (
              <>
                <Field
                  label="Embedding model"
                  hint={findEmbeddingModel(settings.embeddingModel).note}
                >
                  <select
                    className={inputClass}
                    value={settings.embeddingModel}
                    onChange={(event) => setSettings({ embeddingModel: event.target.value })}
                  >
                    {EMBEDDING_MODELS.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.label} — {entry.dims}d · ~
                        {settings.preferWebGPU ? entry.approxSizeMb * 4 : entry.approxSizeMb} MB
                      </option>
                    ))}
                  </select>
                </Field>
                <Switch
                  checked={settings.preferWebGPU}
                  onChange={(preferWebGPU) => setSettings({ preferWebGPU })}
                  label="Use WebGPU when available"
                  hint="Much faster per chunk, but WebGPU needs full-precision weights — roughly 4x the download of the quantised WASM build. Leave off for the smallest first load."
                />
              </>
            ) : null}

            <Field
              label={`Chunk size — ${settings.chunkSize} characters`}
              hint="Applies to documents added from now on. Smaller chunks pinpoint facts; larger ones preserve argument and context."
            >
              <Slider
                value={settings.chunkSize}
                min={400}
                max={2400}
                step={100}
                onChange={(chunkSize) =>
                  setSettings({
                    chunkSize,
                    chunkOverlap: Math.min(settings.chunkOverlap, Math.floor(chunkSize / 2)),
                  })
                }
              />
            </Field>

            <Field
              label={`Chunk overlap — ${settings.chunkOverlap} characters`}
              hint="Overlap keeps sentences that straddle a boundary retrievable from one chunk."
            >
              <Slider
                value={settings.chunkOverlap}
                min={0}
                max={Math.floor(settings.chunkSize / 2)}
                step={20}
                onChange={(chunkOverlap) => setSettings({ chunkOverlap })}
              />
            </Field>
          </div>
        </section>

        <section>
          <SectionTitle>Data</SectionTitle>
          <div className="space-y-3 rounded-xl border border-white/8 bg-ink-850/50 p-3.5">
            <p className="flex items-start gap-2 text-[12px] leading-relaxed text-mist-400">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mist-500" />
              Documents, chunks and vectors live in this browser&rsquo;s IndexedDB. Clearing them is
              immediate and cannot be undone.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={clearChat}>
                Clear conversation
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={!docCount}
                onClick={async () => {
                  await clearLibrary();
                  notify("info", "Library cleared.");
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete all {docCount} document{docCount === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </Sheet>
  );
}
