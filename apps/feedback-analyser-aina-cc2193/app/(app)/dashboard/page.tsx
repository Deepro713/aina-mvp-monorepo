import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarX2, MessageSquarePlus, Sparkles } from "lucide-react";
import { BreakdownChart } from "@/components/BreakdownChart";
import { EntriesTable } from "@/components/EntriesTable";
import { Alert, buttonClass, Card, pageClass, PageHeader } from "@/components/kit";
import { RangeFilter } from "@/components/RangeFilter";
import { loadAppContext } from "@/lib/app-context";
import { pct } from "@/lib/format";
import { CATEGORY_KEYS, CATEGORY_META, SENTIMENT_KEYS, SENTIMENT_META } from "@/lib/labels";
import { getDashboardData, getStats } from "@/lib/queries";
import { RANGES, type Range } from "@/lib/validation";

export const metadata: Metadata = { title: "Dashboard · Feedback Sentiment Analyser" };

const RANGE_TEXT: Record<Range, string> = { "7d": "the last 7 days", "30d": "the last 30 days", all: "all time" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const sp = await searchParams;
  const range: Range = (RANGES as readonly string[]).includes(sp.range ?? "") ? (sp.range as Range) : "all";
  const { user, connection } = await loadAppContext();
  if (!user) redirect("/signin");

  const { stats, entries, next_cursor } = await getDashboardData(user.id, range);
  const hasAny = stats.total > 0 || (range !== "all" && (await getStats(user.id, "all")).total > 0);
  if (!connection && !hasAny) redirect("/connect"); // first run: magic link lands here

  const sentimentData = SENTIMENT_KEYS.map((k) => ({ key: k, label: SENTIMENT_META[k].label, value: stats.sentiment[k], color: SENTIMENT_META[k].color }));
  const categoryData = CATEGORY_KEYS.map((k) => ({ key: k, label: CATEGORY_META[k].label, value: stats.category[k], color: CATEGORY_META[k].color }))
    .sort((a, b) => b.value - a.value);
  const top = categoryData[0];

  return (
    <div className={`${pageClass} space-y-8`}>
      <PageHeader
        crumbs={["App", "Dashboard"]}
        title="Dashboard"
        description={`How your feedback breaks down by sentiment and category, ${RANGE_TEXT[range]}.`}
        actions={<>
          <RangeFilter value={range} />
          <Link href="/analyze" className={buttonClass()}><Sparkles aria-hidden className="size-4" />Analyze feedback</Link>
        </>}
      />

      {!connection && (
        <Alert tone="warning" title="No model connected"
          action={<Link href="/connect" className={buttonClass("secondary", "sm")}>Connect</Link>}>
          You can still review and correct existing entries. Connect a model to analyze new feedback.
        </Alert>
      )}

      {!hasAny ? (
        <Card className="mx-auto max-w-xl text-center">
          <MessageSquarePlus aria-hidden className="mx-auto size-10 text-indigo-300" />
          <h2 className="mt-4 text-lg font-semibold text-white">No feedback yet. Paste your first batch.</h2>
          <p className="mt-2 text-sm text-slate-400">Once entries are analyzed, the sentiment and category breakdown shows up here.</p>
          <Link href="/analyze" className={`${buttonClass()} mt-6`}>Paste feedback</Link>
        </Card>
      ) : stats.total === 0 ? (
        <Card className="mx-auto max-w-xl text-center">
          <CalendarX2 aria-hidden className="mx-auto size-10 text-slate-500" />
          <h2 className="mt-4 text-lg font-semibold text-white">Nothing in {RANGE_TEXT[range]}. Try All.</h2>
          <Link href="/dashboard" className={`${buttonClass("secondary")} mt-6`}>Show all time</Link>
        </Card>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Entries", value: stats.total.toLocaleString("en-US"), tone: "text-white" },
              { label: "Negative", value: `${pct(stats.sentiment.negative, stats.total)}%`, tone: "text-rose-300" },
              { label: "Positive", value: `${pct(stats.sentiment.positive, stats.total)}%`, tone: "text-emerald-300" },
              { label: "Top category", value: top.label, tone: "text-indigo-200" },
            ].map((s) => (
              <Card key={s.label} className="p-5 sm:p-5">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</dt>
                <dd className={`mt-1.5 truncate text-2xl font-semibold ${s.tone}`}>{s.value}</dd>
              </Card>
            ))}
          </dl>
          <div className="grid gap-6 md:grid-cols-2">
            <BreakdownChart title="By sentiment" data={sentimentData} total={stats.total} />
            <BreakdownChart title="By category" data={categoryData} total={stats.total} />
          </div>
        </>
      )}

      {stats.total > 0 && (
        <EntriesTable key={range} initialEntries={entries} initialCursor={next_cursor} range={range} />
      )}
    </div>
  );
}
