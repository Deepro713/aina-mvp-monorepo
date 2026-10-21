import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";
import { buttonClass, Card, pageClass, PageHeader, Pill } from "@/components/kit";
import { loadAppContext } from "@/lib/app-context";
import { timeAgo } from "@/lib/format";
import { PROVIDER_META } from "@/lib/labels";

export const metadata: Metadata = { title: "Account · Feedback Sentiment Analyser" };

export default async function AccountPage() {
  const { user, connection } = await loadAppContext();
  if (!user) redirect("/");
  return (
    <div className={`${pageClass} space-y-8`}>
      <PageHeader crumbs={["App", "Account"]} title="Account" description="Your workspace, model connection and privacy controls." />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-sm font-medium text-slate-400">Workspace</h2>
          <p className="mt-1 text-lg text-white">Private to this browser</p>
          <p className="mt-2 text-sm text-slate-400">
            No sign-in needed. Your connection and entries are tied to a cookie in this browser, so clearing cookies
            or switching browsers starts a fresh workspace.
          </p>
        </Card>
        <Card>
          <h2 className="text-sm font-medium text-slate-400">Model connection</h2>
          {connection ? (
            <div className="mt-1 space-y-2">
              <p className="text-lg text-white">{PROVIDER_META[connection.provider].label} · <span className="font-mono">{connection.model_id}</span></p>
              <div className="flex flex-wrap gap-2">
                {connection.key_last4 && <Pill>Key ••••{connection.key_last4}</Pill>}
                {connection.last_tested_at ? <Pill tone="emerald">Tested {timeAgo(connection.last_tested_at)}</Pill> : <Pill tone="amber">Untested</Pill>}
              </div>
            </div>
          ) : <p className="mt-1 text-lg text-slate-300">No model connected</p>}
          <Link href="/connect" className={`${buttonClass("secondary")} mt-6`}>Manage connection</Link>
        </Card>
      </div>
      <Card className="border-rose-500/30">
        <h2 className="text-lg font-semibold text-rose-200">Danger zone</h2>
        <p className="mt-1.5 max-w-2xl text-sm text-slate-400">
          Deleting your workspace permanently removes your model connection, every analyzed entry and your correction
          history. This can&apos;t be undone.
        </p>
        <DeleteAccountForm />
      </Card>
    </div>
  );
}
