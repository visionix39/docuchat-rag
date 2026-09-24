"use client";

import {
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass, Switch } from "@/components/ui/Field";
import { DEFAULT_MODEL, findProvider, modelsForProvider, PROVIDERS } from "@/lib/models";
import { useStore } from "@/lib/store";
import type { ProviderId } from "@/lib/types";

const CUSTOM = "__custom__";

function ProviderTabs({
  value,
  onChange,
}: {
  value: ProviderId;
  onChange: (provider: ProviderId) => void;
}) {
  const keyStatus = useStore((state) => state.keyStatus);
  const credentials = useStore((state) => state.settings.credentials);

  return (
    <div className="grid grid-cols-3 gap-2">
      {PROVIDERS.map((provider) => {
        const active = provider.id === value;
        const ready = keyStatus[provider.id].state === "valid";
        const filled = credentials[provider.id].key.length > 0;

        return (
          <button
            key={provider.id}
            type="button"
            onClick={() => onChange(provider.id)}
            aria-pressed={active}
            className={`focus-ring relative rounded-xl border px-3 py-2.5 text-left transition-colors ${
              active
                ? "border-iris-400/50 bg-iris-500/12"
                : "border-white/10 bg-white/[0.02] hover:border-white/25"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span
                className={`text-[13px] font-semibold ${active ? "text-white" : "text-mist-200"}`}
              >
                {provider.label}
              </span>
              {ready ? (
                <CheckCircle2 className="h-3 w-3 text-lime-400" />
              ) : filled ? (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              ) : null}
            </span>
            <span className="mt-0.5 block text-[10.5px] leading-tight text-mist-500">
              {provider.vendor}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ApiKeySetup({ compact = false }: { compact?: boolean }) {
  const settings = useStore((state) => state.settings);
  const setSettings = useStore((state) => state.setSettings);
  const setCredentials = useStore((state) => state.setCredentials);
  const verifyKey = useStore((state) => state.verifyKey);
  const keyStatus = useStore((state) => state.keyStatus);

  const [reveal, setReveal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const provider = settings.provider;
  const spec = findProvider(provider);
  const credentials = settings.credentials[provider];
  const status = keyStatus[provider];

  // Models the key actually has access to win over the built-in list.
  const known = modelsForProvider(provider);
  const discovered = status.models ?? [];
  const options = discovered.length
    ? discovered
    : known.map((model) => ({ id: model.id, label: model.label }));
  const isCustom = !options.some((option) => option.id === credentials.model);

  const malformed =
    credentials.key.length > 6 && !spec.keyPattern.test(credentials.key.trim());

  return (
    <div className="space-y-4">
      <ProviderTabs
        value={provider}
        onChange={(next) => {
          setSettings({ provider: next });
          if (!settings.credentials[next].model) {
            setCredentials(next, { model: DEFAULT_MODEL[next] });
          }
        }}
      />

      <p className="text-[12px] leading-relaxed text-mist-400">{spec.blurb}</p>

      <Field
        label={`${spec.vendor} API key`}
        action={
          <button
            type="button"
            onClick={() => setReveal((value) => !value)}
            className="focus-ring inline-flex items-center gap-1 rounded px-1 text-[11px] text-mist-500 hover:text-mist-200"
          >
            {reveal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {reveal ? "Hide" : "Show"}
          </button>
        }
        hint={
          <span className="inline-flex flex-wrap items-center gap-x-1.5">
            <Lock className="h-3 w-3 text-lime-400/70" />
            Stays in your browser and goes straight to {spec.vendor}. No key of mine is bundled with
            this app, and yours never reaches any server of mine.
            <a
              href={spec.consoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-aqua-400 hover:underline"
            >
              Get one at {spec.consoleLabel} <ExternalLink className="h-3 w-3" />
            </a>
          </span>
        }
      >
        <div className="flex gap-2">
          <input
            type={reveal ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            placeholder={spec.keyPlaceholder}
            className={`${inputClass} font-mono text-[13px]`}
            value={credentials.key}
            onChange={(event) => setCredentials(provider, { key: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter") void verifyKey(provider);
            }}
          />
          <Button
            variant={status.state === "valid" ? "outline" : "primary"}
            onClick={() => void verifyKey(provider)}
            disabled={status.state === "checking" || !credentials.key.trim()}
            className="shrink-0"
          >
            {status.state === "checking" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            {status.state === "checking" ? "Testing" : "Test key"}
          </Button>
        </div>
      </Field>

      {malformed && status.state !== "valid" ? (
        <p className="text-[11.5px] text-amber-300/90">
          {spec.vendor} keys usually start with{" "}
          <code className="font-mono">{spec.keyPlaceholder.replace("…", "")}</code> — double-check
          you pasted the right one.
        </p>
      ) : null}

      {status.state === "valid" || status.state === "invalid" ? (
        <p
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-[12px] leading-relaxed ${
            status.state === "valid"
              ? "border-lime-400/25 bg-lime-400/8 text-lime-100"
              : "border-rose-400/25 bg-rose-500/8 text-rose-200"
          }`}
        >
          {status.state === "valid" ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          {status.message}
        </p>
      ) : null}

      <Field
        label="Model"
        hint={
          discovered.length
            ? "Loaded live from your key, so this list is whatever you actually have access to."
            : "Test your key to replace this with the models your account can reach."
        }
      >
        <select
          className={inputClass}
          value={isCustom ? CUSTOM : credentials.model}
          onChange={(event) => {
            if (event.target.value === CUSTOM) return;
            setCredentials(provider, { model: event.target.value });
          }}
        >
          {options.map((option) => {
            const priced = known.find((model) => model.id === option.id);
            return (
              <option key={option.id} value={option.id}>
                {option.label}
                {priced?.inputPerMTok
                  ? ` — $${priced.inputPerMTok}/$${priced.outputPerMTok} per Mtok`
                  : ""}
              </option>
            );
          })}
          <option value={CUSTOM}>Custom model ID…</option>
        </select>
      </Field>

      {isCustom ? (
        <input
          className={`${inputClass} font-mono text-[13px]`}
          value={credentials.model}
          placeholder={DEFAULT_MODEL[provider]}
          onChange={(event) => setCredentials(provider, { model: event.target.value })}
        />
      ) : null}

      {spec.configurableBaseUrl ? (
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((value) => !value)}
            className="focus-ring rounded text-[11.5px] text-mist-500 hover:text-mist-200"
          >
            {showAdvanced ? "Hide" : "Use a different"} OpenAI-compatible endpoint
          </button>
          {showAdvanced ? (
            <div className="mt-2">
              <Field
                label="Base URL"
                hint="Groq, Together, OpenRouter or a local server. It must send permissive CORS headers to be reachable from a browser."
              >
                <input
                  className={`${inputClass} font-mono text-[13px]`}
                  value={credentials.baseUrl ?? ""}
                  onChange={(event) => setCredentials(provider, { baseUrl: event.target.value })}
                />
              </Field>
            </div>
          ) : null}
        </div>
      ) : null}

      {compact ? null : (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3">
          <Switch
            checked={settings.persistKeys}
            onChange={(persistKeys) => setSettings({ persistKeys })}
            label="Remember this key across reloads"
            hint="Saves it in this browser's localStorage. Fine on your own machine; leave it off on a shared or public one — the key then lives in memory only and is gone when you close the tab."
          />
        </div>
      )}
    </div>
  );
}
