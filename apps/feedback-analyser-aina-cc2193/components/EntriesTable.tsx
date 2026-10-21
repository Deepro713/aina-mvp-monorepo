"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, buttonClass, cardClass, Spinner } from "@/components/kit";
import { CategorySelect, SentimentSelect } from "@/components/LabelBadge";
import { apiFetch, toClientError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { PROVIDER_META } from "@/lib/labels";
import type { EntryDto } from "@/lib/types";
import type { Range } from "@/lib/validation";
import { cn } from "@/lib/utils";

const col = createColumnHelper<EntryDto>();

export function EntriesTable({ initialEntries, initialCursor, range }: {
  initialEntries: EntryDto[]; initialCursor: string | null; range: Range;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const setRowBusy = (id: string, on: boolean) =>
    setBusy((b) => { const n = { ...b }; if (on) n[id] = true; else delete n[id]; return n; });

  async function updateLabel(entry: EntryDto, field: "sentiment" | "category", value: string) {
    if (entry[field] === value) return;
    setEntries((es) => es.map((e) => (e.id === entry.id ? ({ ...e, [field]: value } as EntryDto) : e)));
    setRowBusy(entry.id, true);
    try {
      const updated = await apiFetch<EntryDto>(`/api/entries/${entry.id}`, { method: "PATCH", body: JSON.stringify({ [field]: value }) });
      setEntries((es) => es.map((e) => (e.id === updated.id ? updated : e)));
      toast.success("Label updated", { description: "Logged as a correction. Charts are refreshing." });
      router.refresh();
    } catch (e) {
      setEntries((es) => es.map((x) => (x.id === entry.id ? entry : x)));
      toast.error("Couldn't update the label", { description: toClientError(e).message });
    } finally {
      setRowBusy(entry.id, false);
    }
  }

  async function deleteEntry(id: string) {
    setRowBusy(id, true);
    try {
      await apiFetch(`/api/entries/${id}`, { method: "DELETE" });
      setEntries((es) => es.filter((e) => e.id !== id));
      toast.success("Entry deleted");
      router.refresh();
    } catch (e) {
      toast.error("Couldn't delete the entry", { description: toClientError(e).message });
    } finally {
      setRowBusy(id, false);
      setConfirmId(null);
    }
  }

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    setLoadError(null);
    try {
      const page = await apiFetch<{ entries: EntryDto[]; next_cursor: string | null }>(
        `/api/entries?range=${range}&limit=20&cursor=${encodeURIComponent(cursor)}`);
      setEntries((es) => [...es, ...page.entries.filter((n) => !es.some((e) => e.id === n.id))]);
      setCursor(page.next_cursor);
    } catch (e) {
      setLoadError(toClientError(e).message);
    } finally {
      setLoadingMore(false);
    }
  }

  const columns = [
    col.accessor("created_at", {
      header: "Analyzed",
      cell: (c) => <time dateTime={c.getValue()} suppressHydrationWarning className="whitespace-nowrap text-xs text-slate-400">{formatDateTime(c.getValue())}</time>,
    }),
    col.accessor("summary", {
      header: "Feedback",
      cell: (c) => (
        <div className="max-w-md">
          <p className="text-sm text-slate-100">{c.getValue()}</p>
          <details className="group mt-1">
            <summary className="cursor-pointer text-xs text-indigo-300 hover:text-indigo-200">Show original</summary>
            <p className="mt-1.5 whitespace-pre-wrap rounded-lg bg-slate-950/60 p-2.5 text-xs text-slate-400">{c.row.original.raw_text}</p>
          </details>
        </div>
      ),
    }),
    col.accessor("sentiment", {
      header: "Sentiment",
      cell: (c) => <SentimentSelect value={c.getValue()} disabled={busy[c.row.original.id]} onChange={(v) => updateLabel(c.row.original, "sentiment", v)} />,
    }),
    col.accessor("category", {
      header: "Category",
      cell: (c) => <CategorySelect value={c.getValue()} disabled={busy[c.row.original.id]} onChange={(v) => updateLabel(c.row.original, "category", v)} />,
    }),
    col.accessor("model_id", {
      header: "Model",
      cell: (c) => (
        <div className="text-xs">
          <p className="text-slate-300">{PROVIDER_META[c.row.original.provider].label}</p>
          <p className="max-w-[140px] truncate font-mono text-slate-500">{c.getValue()}</p>
        </div>
      ),
    }),
    col.display({
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: (c) => {
        const id = c.row.original.id;
        if (busy[id] && confirmId === id) return <Spinner className="text-slate-400" />;
        return confirmId === id ? (
          <div className="flex gap-1.5">
            <button type="button" onClick={() => deleteEntry(id)} className={buttonClass("danger", "sm")}>Delete</button>
            <button type="button" onClick={() => setConfirmId(null)} className={buttonClass("ghost", "sm")}>Cancel</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmId(id)} aria-label="Delete entry" title="Delete entry"
            className={cn(buttonClass("ghost", "sm"), "text-slate-500 hover:text-rose-300")}>
            <Trash2 aria-hidden className="size-4" />
          </button>
        );
      },
    }),
  ];

  const table = useReactTable({ data: entries, columns, getCoreRowModel: getCoreRowModel(), getRowId: (r) => r.id });

  return (
    <section className={cn(cardClass, "p-0 sm:p-0")} aria-labelledby="latest-h">
      <div className="flex flex-wrap items-center justify-between gap-2 px-6 pt-6 sm:px-8">
        <div>
          <h2 id="latest-h" className="font-semibold text-white">Latest entries</h2>
          <p className="text-sm text-slate-400">Wrong label? Change it inline. Every correction is logged.</p>
        </div>
      </div>
      {entries.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-slate-500 sm:px-8">All entries in this range were deleted.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-y border-white/10 bg-white/[0.02] text-xs uppercase tracking-wide text-slate-500">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => <th key={h.id} className="px-4 py-2.5 font-medium first:pl-6 sm:first:pl-8">{flexRender(h.column.columnDef.header, h.getContext())}</th>)}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-white/5">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className={cn("align-top transition hover:bg-white/[0.02]", busy[row.id] && "opacity-70")}>
                  {row.getVisibleCells().map((cell) => <td key={cell.id} className="px-4 py-3.5 first:pl-6 sm:first:pl-8">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-col items-center gap-3 border-t border-white/10 px-6 py-4 sm:px-8">
        {loadError && <Alert tone="error" className="w-full">{loadError}</Alert>}
        {cursor ? (
          <button type="button" onClick={loadMore} disabled={loadingMore} className={buttonClass("secondary", "sm")}>
            {loadingMore ? <><Spinner /> Loading…</> : "Load more"}
          </button>
        ) : entries.length > 0 && <p className="text-xs text-slate-500">That&apos;s everything in this range.</p>}
      </div>
    </section>
  );
}
