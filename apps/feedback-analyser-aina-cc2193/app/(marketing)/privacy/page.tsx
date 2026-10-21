import type { Metadata } from "next";
import { Card, pageClass, PageHeader } from "@/components/kit";

export const metadata: Metadata = { title: "Privacy · Feedback Sentiment Analyser" };

const SECTIONS = [
  { h: "What we collect", p: "Your email address (for sign-in), the customer feedback you paste, the labels and summaries your model produces, the corrections you make, and your model connection with the API key encrypted." },
  { h: "Where your feedback goes", p: "Pasted text is sent only to the language-model provider you connect (for example OpenAI, Anthropic, Google, or your own endpoint), under that provider's terms. We never send it to any other model." },
  { h: "How we protect API keys", p: "Keys are encrypted at rest with AES-256-GCM and bound to your account. The app only ever shows their last 4 characters. Keys and provider error messages are never written to logs." },
  { h: "Where data is stored", p: "In a managed Postgres database (Neon) in a single US region. Sign-in emails are sent through Resend. Plausible analytics runs on public pages only. It sets no cookies and collects no personal data." },
  { h: "Deleting your data", p: "You can delete any single entry from the dashboard, or your whole account from the Account page. Deleting your account permanently removes your connection, entries and corrections." },
  { h: "Not covered", p: "Don't paste protected health information (PHI) or other regulated data. V1 doesn't offer a Data Processing Agreement or EU data residency." },
];

export default function PrivacyPage() {
  return (
    <div className={`${pageClass} max-w-3xl space-y-8`}>
      <PageHeader crumbs={["Home", "Privacy"]} title="Privacy" description="Plain-language summary of what happens to your data." />
      <Card className="space-y-6">
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="font-semibold text-white">{s.h}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{s.p}</p>
          </section>
        ))}
      </Card>
    </div>
  );
}
