import type { Metadata } from "next";
import { KeyRound, Server } from "lucide-react";
import { Card, pageClass, PageHeader } from "@/components/kit";
import { ProviderForm } from "@/components/ProviderForm";
import { loadAppContext } from "@/lib/app-context";

export const metadata: Metadata = { title: "Connect a model · Feedback Sentiment Analyser" };

export default async function ConnectPage() {
  const { connection } = await loadAppContext();
  return (
    <div className={`${pageClass} space-y-8`}>
      <PageHeader
        crumbs={["App", "Connect"]}
        title={connection ? "Your model connection" : "Connect your model"}
        description="Pick a provider, test the connection, then save. Feedback you analyze is sent only to this provider."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <ProviderForm initial={connection} />
        <aside className="space-y-4">
          <Card className="p-5 sm:p-6">
            <KeyRound aria-hidden className="size-5 text-indigo-300" />
            <h2 className="mt-3 font-semibold text-white">How your key is stored</h2>
            <p className="mt-1.5 text-sm text-slate-400">
              Encrypted with AES-256-GCM and tied to your account. We only ever show the last 4 characters. To replace
              it, type a new key and test again.
            </p>
          </Card>
          <Card className="p-5 sm:p-6">
            <Server aria-hidden className="size-5 text-fuchsia-300" />
            <h2 className="mt-3 font-semibold text-white">Using Ollama or a self-hosted model?</h2>
            <p className="mt-1.5 text-sm text-slate-400">
              Choose <strong className="text-slate-200">OpenAI-compatible</strong> and enter a public{" "}
              <code className="text-slate-300">https://</code> URL, for example{" "}
              <code className="text-slate-300">https://ollama.example.com/v1</code>. Our servers can&apos;t reach{" "}
              <code className="text-slate-300">localhost</code> or private networks, and redirects aren&apos;t followed.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
