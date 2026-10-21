"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Alert, buttonClass, cardClass, FieldError, inputClass, labelClass, Pill, Spinner } from "@/components/kit";
import { apiFetch, toClientError } from "@/lib/api-client";
import type { Provider } from "@/lib/db/schema";
import { PROVIDER_KEYS, PROVIDER_META } from "@/lib/labels";
import type { ConnectionDto } from "@/lib/types";
import { cn } from "@/lib/utils";

type TestOk = { snapshot: string; token: string; latency: number };
type TestResponse = { ok: true; latency_ms: number; model_id: string; test_token: string };

export function ProviderForm({ initial }: { initial: ConnectionDto | null }) {
  const router = useRouter();
  const [provider, setProvider] = useState<Provider>(initial?.provider ?? "openai");
  const [modelId, setModelId] = useState(initial?.model_id ?? "");
  const [baseUrl, setBaseUrl] = useState(initial?.base_url ?? "");
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<"idle" | "confirm" | "busy">("idle");
  const [tested, setTested] = useState<TestOk | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const meta = PROVIDER_META[provider];
  const isCompat = provider === "openai_compatible";
  // Backend reuses the saved key only for the same provider + base URL.
  const savedKeyApplies = Boolean(initial?.key_last4) && initial?.provider === provider &&
    (!isCompat || (initial?.base_url ?? "") === baseUrl.trim());
  const snapshot = JSON.stringify([provider, modelId.trim(), isCompat ? baseUrl.trim() : "", apiKey.trim()]);
  const testPassed = tested?.snapshot === snapshot;
  const busy = testing || saving || removing === "busy";

  const clearField = (f: string) => setFieldErrors(({ [f]: _, ...rest }) => rest);

  function selectProvider(p: Provider) {
    setProvider(p);
    setModelId(initial?.provider === p ? initial.model_id : "");
    setBaseUrl(initial?.provider === p ? initial.base_url ?? "" : "");
    setApiKey("");
    setFieldErrors({});
    setTestError(null);
  }

  function payload() {
    return {
      provider,
      model_id: modelId.trim(),
      base_url: isCompat ? baseUrl.trim() : null,
      ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
    };
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!modelId.trim()) errs.model_id = "Enter a model ID.";
    if (isCompat) {
      const u = baseUrl.trim();
      if (!u) errs.base_url = "Enter the endpoint's HTTPS base URL.";
      else if (!/^https:\/\//i.test(u)) errs.base_url = "Use an https:// URL. Plain http isn't allowed.";
      else if (/^https:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(u))
        errs.base_url = "localhost isn't reachable from our servers. Expose a public HTTPS URL.";
    }
    if (meta.keyRequired && !apiKey.trim() && !savedKeyApplies) errs.api_key = `Enter your ${meta.label} API key.`;
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function showError(e: unknown, target: "test" | "form") {
    const err = toClientError(e);
    if (err.fields) setFieldErrors((f) => ({ ...f, ...err.fields }));
    (target === "test" ? setTestError : setFormError)(err.message);
  }

  async function handleTest() {
    setTestError(null);
    setFormError(null);
    setTested(null);
    if (!validate()) return;
    setTesting(true);
    const snap = snapshot;
    try {
      const r = await apiFetch<TestResponse>("/api/connection/test", { method: "POST", body: JSON.stringify(payload()) });
      setTested({ snapshot: snap, token: r.test_token, latency: r.latency_ms });
    } catch (e) {
      showError(e, "test");
    } finally {
      setTesting(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!testPassed || !tested || busy) return;
    setSaving(true);
    setFormError(null);
    try {
      await apiFetch("/api/connection", { method: "PUT", body: JSON.stringify({ ...payload(), test_token: tested.token }) });
      toast.success(`${meta.label} connected`, { description: `${modelId.trim()} is ready. Paste some feedback to try it.` });
      router.push("/analyze");
      router.refresh();
    } catch (err) {
      showError(err, "form");
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (removing === "idle") return setRemoving("confirm");
    setRemoving("busy");
    try {
      await apiFetch("/api/connection", { method: "DELETE" });
      toast.success("Connection removed", { description: "Your saved entries are untouched." });
      setApiKey("");
      setTested(null);
      router.refresh();
    } catch (e) {
      showError(e, "form");
    } finally {
      setRemoving("idle");
    }
  }

  return (
    <form onSubmit={handleSave} noValidate className={cn(cardClass, "space-y-6")}>
      <fieldset>
        <legend className={labelClass}>Provider</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {PROVIDER_KEYS.map((p) => {
            const m = PROVIDER_META[p];
            const checked = p === provider;
            return (
              <label key={p} className={cn(
                "relative flex cursor-pointer gap-3 rounded-xl border p-4 transition focus-within:ring-2 focus-within:ring-indigo-400",
                checked ? "border-indigo-400/60 bg-indigo-500/10" : "border-white/10 bg-white/[0.03] hover:border-white/20",
              )}>
                <input type="radio" name="provider" value={p} checked={checked} onChange={() => selectProvider(p)}
                  className="mt-0.5 size-4 shrink-0 accent-indigo-500" />
                <span className="pr-12">
                  <span className="block text-sm font-medium text-white">{m.label}</span>
                  <span className="block text-xs text-slate-400">{m.blurb}</span>
                </span>
                {initial?.provider === p && <Pill tone="indigo" className="absolute right-3 top-3">Saved</Pill>}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className={isCompat ? "" : "sm:col-span-2"}>
          <label htmlFor="model_id" className={labelClass}>Model ID</label>
          <input id="model_id" value={modelId} placeholder={meta.modelPlaceholder} autoComplete="off" spellCheck={false}
            onChange={(e) => { setModelId(e.target.value); clearField("model_id"); }}
            aria-invalid={!!fieldErrors.model_id} aria-describedby="model_id-error" className={cn(inputClass, "font-mono")} />
          <FieldError id="model_id-error" message={fieldErrors.model_id} />
        </div>
        {isCompat && (
          <div>
            <label htmlFor="base_url" className={labelClass}>Base URL</label>
            <input id="base_url" type="url" inputMode="url" value={baseUrl} placeholder="https://ollama.example.com/v1"
              onChange={(e) => { setBaseUrl(e.target.value); clearField("base_url"); }}
              aria-invalid={!!fieldErrors.base_url} aria-describedby="base_url-error" className={cn(inputClass, "font-mono")} />
            <FieldError id="base_url-error" message={fieldErrors.base_url} />
          </div>
        )}
        <div className="sm:col-span-2">
          <label htmlFor="api_key" className={labelClass}>
            API key {!meta.keyRequired && <span className="font-normal text-slate-500">(optional)</span>}
          </label>
          <input id="api_key" type="password" value={apiKey} autoComplete="off" spellCheck={false}
            placeholder={savedKeyApplies ? `••••${initial?.key_last4}  (saved; leave blank to keep it)` : meta.keyPlaceholder}
            onChange={(e) => { setApiKey(e.target.value); clearField("api_key"); }}
            aria-invalid={!!fieldErrors.api_key} aria-describedby="api_key-error" className={cn(inputClass, "font-mono")} />
          <FieldError id="api_key-error" message={fieldErrors.api_key} />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
        <button type="button" onClick={handleTest} disabled={busy} className={buttonClass("secondary")}>
          {testing ? <><Spinner /> Testing…</> : <><Zap aria-hidden className="size-4" /> Test connection</>}
        </button>
        <button type="submit" disabled={!testPassed || busy} className={buttonClass("primary")}>
          {saving ? <><Spinner /> Saving…</> : "Save connection"}
        </button>
        <div aria-live="polite" className="text-sm sm:ml-2">
          {testPassed && tested ? (
            <Pill tone="emerald"><CheckCircle2 aria-hidden className="size-3.5" />OK · {tested.latency} ms</Pill>
          ) : !testError && (
            <span className="text-slate-500">Save unlocks after a passing test.</span>
          )}
        </div>
      </div>
      {testError && <Alert tone="error" title="Test failed">{testError}</Alert>}
      {formError && <Alert tone="error" title="Couldn't save">{formError}</Alert>}

      {initial && (
        <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-5 text-sm">
          <button type="button" onClick={handleRemove} disabled={busy}
            className={removing === "idle" ? "inline-flex items-center gap-1.5 text-rose-300 hover:text-rose-200 disabled:opacity-50" : buttonClass("danger", "sm")}>
            {removing === "busy" ? <Spinner /> : <Trash2 aria-hidden className="size-4" />}
            {removing === "idle" ? "Remove connection" : "Yes, remove it"}
          </button>
          {removing === "confirm" && (
            <>
              <span className="text-slate-400">Your saved entries stay. You&apos;ll need a new connection to analyze.</span>
              <button type="button" onClick={() => setRemoving("idle")} className={buttonClass("ghost", "sm")}>Cancel</button>
            </>
          )}
        </div>
      )}
    </form>
  );
}
