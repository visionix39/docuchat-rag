"use client";

import { ShieldAlert, Trash2 } from "lucide-react";
import { ApiKeySetup } from "@/components/ApiKeySetup";
import { Button } from "@/components/ui/Button";
import { Field, inputClass, Segmented, Slider, Switch } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { EMBEDDING_MODELS, findEmbeddingModel, resolveChatModel } from "@/lib/models";
import { useStore } from "@/lib/store";

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

  const model = resolveChatModel(settings.provider, settings.credentials[settings.provider].model);

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
          <SectionTitle>Your API key</SectionTitle>
          <ApiKeySetup />
        </section>

        <section>
          <SectionTitle>Answering</SectionTitle>
          <div className="space-y-4">
            {model.thinking === "adaptive" || model.supportsThoughts ? (
              <Switch
                checked={settings.showReasoning}
                onChange={(showReasoning) => setSettings({ showReasoning })}
                label="Show reasoning summary"
                hint="Streams a readable summary of the model's reasoning above each answer."
              />
            ) : null}

            {model.thinking === "adaptive" ? (
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
            ) : null}

            {model.supportsTemperature ? (
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
