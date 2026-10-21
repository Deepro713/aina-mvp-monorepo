"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import pLimit from "p-limit";
import { ArrowRight, Inbox, RotateCcw, ShieldAlert, Sparkles, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { AnalysisRow, type AnalysisRowState } from "@/components/AnalysisRow";
import { Alert, buttonClass, cardClass, FieldError, pillTones, Spinner } from "@/components/kit";
import { apiFetch, toClientError } from "@/lib/api-client";
import { BATCH_CONCURRENCY, BATCH_MAX, RAW_TEXT_MAX } from "@/lib/site";
import type { EntryDto } from "@/lib/types";
import { cn } from "@/lib/utils";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => { window.removeEventListener("online", cb); window.removeEventListener("offline", cb); };
}

export function BatchComposer({ providerLabel, modelId }: { providerLabel: string; modelId: string }) {
  const [text, setText] = useState("");
  const [single, setSingle] = useState(false);
  const [rows, setRows] = useState<AnalysisRowState[]>([]);
  const [limit] = useState(() => pLimit(BATCH_CONCURRENCY));
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

  const entries = useMemo(
    () => single ? (text.trim() ? [text.trim()] : []) : text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean),
    [text, single],
  );
  const tooMany = entries.length > BATCH_MAX;
  const tooLongAt = entries.findIndex((e) => e.length > RAW_TEXT_MAX);
  const running = rows.some((r) => r.status === "queued" || r.status === "running");
  const saved = rows.filter((r) => r.status === "saved").length;
  const failed = rows.filter((r) => r.status === "error");
  const retryable = failed.filter((r) => r.error?.retryable);
  const done = rows.length - rows.filter((r) => r.status === "queued" || r.status === "running").length;

  useEffect(() => {
    if (!running) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  const patch = (key: string, p: Partial<AnalysisRowState>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const run = (row: { key: string; text: string }) => limit(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      patch(row.key, { status: "error", error: { code: "offline", retryable: true, message: "You're offline, so this entry wasn't sent. Nothing saved." } });
      return false;
    }
    patch(row.key, { status: "running", error: undefined });
    try {
      const entry = await apiFetch<EntryDto>("/api/analyze", { method: "POST", body: JSON.stringify({ raw_text: row.text }) });
      patch(row.key, { status: "saved", entry });
      return true;
    } catch (e) {
      const err = toClientError(e);
      patch(row.key, { status: "error", error: { code: err.code, retryable: err.retryable, message: err.message } });
      return false;
    }
  });

  function analyze() {
    if (!entries.length || tooMany || tooLongAt !== -1 || running) return;
    const batch = entries.map((t) => ({ key: crypto.randomUUID(), text: t, status: "queued" as const }));
    setRows(batch);
    setText("");
    void Promise.all(batch.map(run)).then((results) => {
      const ok = results.filter(Boolean).length;
      if (ok === batch.length) toast.success(`${ok} ${ok === 1 ? "entry" : "entries"} analyzed and saved`);
      else toast.warning(`${ok} of ${batch.length} saved`, { description: "Failed rows show why. Retry them below." });
    });
  }

  function retry(rs: AnalysisRowState[]) {
    rs.forEach((r) => patch(r.key, { status: "queued", error: undefined }));
    void Promise.all(rs.map(run));
  }

  function moveFailedBack() {
    setText((t) => [t.trim(), ...failed.map((r) => r.text)].filter(Boolean).join("\n"));
    setRows((rs) => rs.filter((r) => r.status !== "error"));
  }

  const counterTone = tooMany ? pillTones.rose : entries.length ? pillTones.indigo : pillTones.slate;
  const inputError = tooMany
    ? `That's ${entries.length} entries. The limit is ${BATCH_MAX} per batch, so remove ${entries.length - BATCH_MAX} or split them into two batches.`
    : tooLongAt !== -1
      ? `Entry ${tooLongAt + 1} is over ${RAW_TEXT_MAX.toLocaleString("en-US")} characters. Shorten or split it.`
      : null;

  return (
    <div className="space-y-6">
      {!online && (
        <Alert tone="warning" title="You're offline.">
          {rows.length ? `${saved} of ${rows.length} entries saved. ` : ""}Unsent entries can be retried once you&apos;re back online.
        </Alert>
      )}

      <section className={cardClass} aria-labelledby="composer-h">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="composer-h" className="text-lg font-semibold text-white">Paste feedback</h2>
          <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums", counterTone)}>
            {entries.length} / {BATCH_MAX} entries
          </span>
        </div>
        <label htmlFor="feedback" className="sr-only">Customer feedback</label>
        <textarea
          id="feedback" autoFocus rows={10} value={text} disabled={running}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); analyze(); } }}
          placeholder={"One entry per line, e.g.\nCheckout charged my card twice for the annual plan.\nThe new dashboard is so much faster, thank you!"}
          aria-invalid={!!inputError} aria-describedby="composer-hint composer-error"
          className="mt-4 block w-full resize-y rounded-xl border border-white/10 bg-slate-950/60 p-4 font-mono text-[13px] leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60 aria-[invalid=true]:border-rose-500/70"
        />
        <p id="composer-hint" className="mt-2 text-xs text-slate-500">
          {single ? "Everything above is analyzed as one entry." : "One entry per line. Blank lines are ignored."} Up to {BATCH_MAX} entries,{" "}
          {RAW_TEXT_MAX.toLocaleString("en-US")} characters each. Press ⌘/Ctrl + Enter to analyze.
        </p>
        <FieldError id="composer-error" message={inputError} />

        <div className="mt-5 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={single} onChange={(e) => setSingle(e.target.checked)} disabled={running}
              className="size-4 rounded border-white/20 accent-indigo-500" />
            Treat everything as one entry
          </label>
          <button type="button" onClick={analyze} disabled={running || !entries.length || !!inputError}
            className={buttonClass("primary", "lg")}>
            {running ? <><Spinner /> Analyzing {done}/{rows.length}…</>
              : <><Sparkles aria-hidden className="size-4" />Analyze{entries.length > 1 ? ` ${entries.length} entries` : ""}</>}
          </button>
        </div>

        <div className="mt-5 flex gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-[13px] text-amber-100/90">
          <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-400" />
          <p>
            Pasted text is sent to <strong>{providerLabel}</strong> (<span className="font-mono">{modelId}</span>) and saved to your account.
            Remove personal details you don&apos;t want shared, and never paste health information.
          </p>
        </div>
      </section>

      {rows.length === 0 ? (
        <section className={cn(cardClass, "border-dashed text-center")}>
          <Inbox aria-hidden className="mx-auto size-8 text-slate-600" />
          <p className="mt-3 font-medium text-slate-300">Results appear here</p>
          <p className="mt-1 text-sm text-slate-500">
            Each entry gets a sentiment, a category and a one-line summary, and is saved to your dashboard as soon as it&apos;s done.
          </p>
        </section>
      ) : (
        <section className={cardClass} aria-labelledby="results-h">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="results-h" className="text-lg font-semibold text-white">Results</h2>
              <p className="text-sm text-slate-400">
                {saved} of {rows.length} saved{failed.length ? ` · ${failed.length} failed` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!running && retryable.length > 0 && (
                <button type="button" onClick={() => retry(retryable)} className={buttonClass("secondary", "sm")}>
                  <RotateCcw aria-hidden className="size-3.5" />Retry failed ({retryable.length})
                </button>
              )}
              {!running && failed.length > 0 && (
                <button type="button" onClick={moveFailedBack} className={buttonClass("ghost", "sm")}>
                  <Undo2 aria-hidden className="size-3.5" />Move failed back to composer
                </button>
              )}
              {!running && saved > 0 && (
                <Link href="/dashboard" className={buttonClass("primary", "sm")}>View dashboard <ArrowRight aria-hidden className="size-3.5" /></Link>
              )}
            </div>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5" aria-hidden>
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all"
              style={{ width: `${rows.length ? (done / rows.length) * 100 : 0}%` }} />
          </div>
          <ul aria-live="polite" className="mt-2 divide-y divide-white/5">
            {rows.map((r, i) => <AnalysisRow key={r.key} row={r} index={i + 1} onRetry={() => retry([r])} />)}
          </ul>
        </section>
      )}
    </div>
  );
}
