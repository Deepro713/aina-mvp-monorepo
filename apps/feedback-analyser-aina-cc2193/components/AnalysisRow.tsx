import Link from "next/link";
import { CheckCircle2, Clock, RotateCcw, XCircle } from "lucide-react";
import { buttonClass, Spinner } from "@/components/kit";
import { CategoryBadge, SentimentBadge } from "@/components/LabelBadge";
import type { EntryDto } from "@/lib/types";

export type AnalysisRowState = {
  key: string;
  text: string;
  status: "queued" | "running" | "saved" | "error";
  entry?: EntryDto;
  error?: { message: string; retryable: boolean; code: string };
};

const STATUS = {
  queued: { icon: <Clock aria-hidden className="size-4 text-slate-500" />, sr: "Queued" },
  running: { icon: <Spinner className="text-indigo-300" />, sr: "Analyzing" },
  saved: { icon: <CheckCircle2 aria-hidden className="size-4 text-emerald-400" />, sr: "Saved" },
  error: { icon: <XCircle aria-hidden className="size-4 text-rose-400" />, sr: "Failed" },
};

export function AnalysisRow({ row, index, onRetry }: { row: AnalysisRowState; index: number; onRetry: () => void }) {
  const s = STATUS[row.status];
  return (
    <li className="flex gap-4 py-4">
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center">{s.icon}<span className="sr-only">{`Entry ${index}: ${s.sr}`}</span></span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm text-slate-400">
          <span className="mr-2 text-xs tabular-nums text-slate-600">#{index}</span>{row.text}
        </p>
        {row.status === "queued" && <p className="mt-1 text-xs text-slate-500">Waiting for a free slot…</p>}
        {row.status === "running" && (
          <div className="mt-2 space-y-2" aria-hidden>
            <div className="flex gap-2"><div className="h-5 w-20 animate-pulse rounded-full bg-white/10" /><div className="h-5 w-28 animate-pulse rounded-full bg-white/10" /></div>
            <div className="h-4 w-3/4 animate-pulse rounded bg-white/5" />
          </div>
        )}
        {row.status === "saved" && row.entry && (
          <>
            <div className="mt-2 flex flex-wrap gap-2">
              <SentimentBadge value={row.entry.sentiment} />
              <CategoryBadge value={row.entry.category} />
            </div>
            <p className="mt-1.5 text-sm text-slate-100">{row.entry.summary}</p>
          </>
        )}
        {row.status === "error" && row.error && (
          <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[13px] text-rose-100">
            <span className="min-w-0 flex-1">{row.error.message}</span>
            {row.error.code === "no_connection" || row.error.code === "connection_unreadable" ? (
              <Link href="/connect" className={buttonClass("secondary", "sm")}>Fix connection</Link>
            ) : row.error.retryable && (
              <button type="button" onClick={onRetry} className={buttonClass("secondary", "sm")}>
                <RotateCcw aria-hidden className="size-3.5" />Retry
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
