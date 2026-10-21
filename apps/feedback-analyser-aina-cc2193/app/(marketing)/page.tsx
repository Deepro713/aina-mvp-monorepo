import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, ClipboardPaste, PencilLine, Plug, ShieldCheck, Tags } from "lucide-react";
import { buttonClass, Card, Orbs, Pill } from "@/components/kit";
import { CategoryBadge, SentimentBadge } from "@/components/LabelBadge";
import { SENTIMENT_META } from "@/lib/labels";

const STEPS = [
  { icon: Plug, title: "Connect", body: "Add your OpenAI, Anthropic or Gemini key, or any OpenAI-compatible endpoint. Test it before you save." },
  { icon: ClipboardPaste, title: "Paste", body: "Drop in up to 25 entries, one per line. Each is labelled with a sentiment, a category and a one-line summary." },
  { icon: BarChart3, title: "See the breakdown", body: "Every entry is saved. The dashboard rolls them up by sentiment and category over 7 days, 30 days or all time." },
];

const SAMPLE_BARS = [
  { key: "negative" as const, value: 38 },
  { key: "positive" as const, value: 31 },
  { key: "neutral" as const, value: 19 },
  { key: "mixed" as const, value: 12 },
];

export default function LandingPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <Orbs />
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2">
          <div>
            <Pill tone="indigo">Bring your own model</Pill>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              See what your customers are <span className="bg-gradient-to-r from-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">really saying</span>.
            </h1>
            <p className="mt-5 max-w-xl text-base text-slate-300 sm:text-lg">
              Connect the language model you already use, paste customer feedback, and get every entry labelled with a
              sentiment, a category and a short summary. Entries are saved and rolled up on a dashboard.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-slate-300">
              {[
                "OpenAI, Anthropic, Gemini or any OpenAI-compatible endpoint",
                "Up to 25 entries per paste, analyzed 3 at a time",
                "Fix any label in one click. Every correction is logged",
              ].map((b) => (
                <li key={b} className="flex gap-2.5">
                  <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                  {b}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard" className={buttonClass("primary", "lg")}>
                Get started <ArrowRight aria-hidden className="size-4" />
              </Link>
              <Link href="#how" className={buttonClass("secondary", "lg")}>How it works</Link>
            </div>
          </div>

          {/* Sample dashboard, rendered with the real badge components */}
          <Card className="relative p-5 shadow-2xl shadow-indigo-950/50 sm:p-6" aria-label="Sample dashboard preview">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white">Sentiment · last 30 days</p>
              <Pill tone="slate">100 entries</Pill>
            </div>
            <div className="mt-4 space-y-3">
              {SAMPLE_BARS.map((b) => (
                <div key={b.key} className="flex items-center gap-3 text-sm">
                  <span className="w-20 text-slate-300">{SENTIMENT_META[b.key].label}</span>
                  <div className="h-5 flex-1 rounded-md bg-white/5">
                    <div className="h-5 rounded-md" style={{ width: `${b.value * 2.4}%`, background: SENTIMENT_META[b.key].color }} />
                  </div>
                  <span className="w-8 text-right tabular-nums text-slate-400">{b.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
              {[
                { s: "negative" as const, c: "pricing_billing" as const, t: "Customer was double-charged for the annual plan and is unhappy with the refund timeline." },
                { s: "positive" as const, c: "praise" as const, t: "Customer praises the faster new dashboard, noticed by their whole team." },
                { s: "mixed" as const, c: "usability" as const, t: "Customer likes the insights but found the filter hard to locate." },
              ].map((e) => (
                <div key={e.t} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                  <div className="flex flex-wrap gap-2"><SentimentBadge value={e.s} /><CategoryBadge value={e.c} /></div>
                  <p className="mt-2 text-[13px] text-slate-300">{e.t}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-semibold text-white sm:text-[28px]">Connect → paste → see the breakdown</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-slate-400">Takes about two minutes, and you pay your own provider directly.</p>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <Card className="h-full">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-indigo-500/15 text-indigo-300"><s.icon aria-hidden className="size-5" /></span>
                  <span className="text-xs font-medium text-slate-500">Step {i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{s.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto grid max-w-[1200px] gap-4 px-4 pb-16 sm:px-6 md:grid-cols-3">
        {[
          { icon: Tags, title: "Fixed, comparable labels", body: "Four sentiments and seven categories (bug, feature request, pricing & billing, usability, support, praise, other), so your breakdown stays consistent." },
          { icon: PencilLine, title: "Corrections you can measure", body: "Change a wrong label from the dashboard. Each edit is logged so you can see how accurate your model is." },
          { icon: ShieldCheck, title: "Your key stays yours", body: "API keys are encrypted at rest and only the last 4 characters are ever shown. Feedback goes only to the provider you connect." },
        ].map((f) => (
          <Card key={f.title}>
            <f.icon aria-hidden className="size-5 text-fuchsia-300" />
            <h3 className="mt-3 font-semibold text-white">{f.title}</h3>
            <p className="mt-1.5 text-sm text-slate-400">{f.body}</p>
          </Card>
        ))}
      </section>

      <section className="mx-auto max-w-[1200px] px-4 pb-24 sm:px-6">
        <Card className="flex flex-col items-start gap-4 bg-gradient-to-br from-indigo-600/20 to-fuchsia-600/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Ready to triage your first batch?</h2>
            <p className="mt-1 text-sm text-slate-300">No account or sign-in needed. Just open the app.</p>
          </div>
          <Link href="/dashboard" className={buttonClass("primary", "lg")}>Get started <ArrowRight aria-hidden className="size-4" /></Link>
        </Card>
      </section>
    </>
  );
}
