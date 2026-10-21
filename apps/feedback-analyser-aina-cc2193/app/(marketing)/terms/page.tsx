import type { Metadata } from "next";
import { Alert, Card, pageClass, PageHeader } from "@/components/kit";

export const metadata: Metadata = { title: "Terms · Feedback Sentiment Analyser" };

const TERMS = [
  { h: "The service", p: "Feedback Sentiment Analyser is a prototype. It's provided as is, without warranties, and may change or go offline while it's being developed." },
  { h: "Your model and your costs", p: "You connect your own language-model provider and are responsible for that provider's charges and terms. Model labels can be wrong, so review anything important before acting on it." },
  { h: "Your content", p: "You confirm you're allowed to process the feedback you paste and to send it to the provider you connected. You keep ownership of your content." },
  { h: "Acceptable use", p: "Don't use the service to probe networks, overload endpoints, or get around the limits (25 entries per batch, 500 analyses per day)." },
  { h: "Ending use", p: "You can delete your account at any time from the Account page. We may suspend accounts that misuse the service." },
];

export default function TermsPage() {
  return (
    <div className={`${pageClass} max-w-3xl space-y-8`}>
      <PageHeader crumbs={["Home", "Terms"]} title="Terms of use" />
      <Alert tone="warning" title="No protected health information">
        Don&apos;t paste protected health information (PHI) or other regulated personal data. The service is not HIPAA-compliant.
      </Alert>
      <Card className="space-y-6">
        {TERMS.map((t) => (
          <section key={t.h}>
            <h2 className="font-semibold text-white">{t.h}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{t.p}</p>
          </section>
        ))}
      </Card>
    </div>
  );
}
