import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { BatchComposer } from "@/components/BatchComposer";
import { ConnectCard } from "@/components/ConnectCard";
import { buttonClass, pageClass, PageHeader } from "@/components/kit";
import { loadAppContext } from "@/lib/app-context";
import { PROVIDER_META } from "@/lib/labels";

export const metadata: Metadata = { title: "Analyze feedback · Feedback Sentiment Analyser" };

export default async function AnalyzePage() {
  const { connection } = await loadAppContext();
  return (
    <div className={`${pageClass} space-y-8`}>
      <PageHeader
        crumbs={["App", "Analyze"]}
        title="Analyze feedback"
        description="Paste customer feedback, one entry per line. Your model labels each entry with a sentiment, a category and a one-line summary."
        actions={<Link href="/dashboard" className={buttonClass("secondary")}><BarChart3 aria-hidden className="size-4" />View dashboard</Link>}
      />
      {connection
        ? <BatchComposer providerLabel={PROVIDER_META[connection.provider].label} modelId={connection.model_id} />
        : <ConnectCard />}
    </div>
  );
}
