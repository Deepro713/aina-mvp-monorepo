import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";
import { buttonClass, Card, pageClass, PageHeader, Pill } from "@/components/kit";
import { loadAppContext } from "@/lib/app-context";
import { timeAgo } from "@/lib/format";
import { PROVIDER_META } from "@/lib/labels";
import { signOutAction } from "../actions";

export const metadata: Metadata = { title: "Account · Feedback Sentiment Analyser" };

export default async function AccountPage() {
  const { user, connection } = await loadAppContext();
  if (!user) redirect("/signin");
  return (
    <div className={`${pageClass} space-y-8`}>
      <PageHeader crumbs={["App", "Account"]} title="Account" description="Your sign-in details, model connection and privacy controls." />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-sm font-medium text-slate-400">Signed in as</h2>
          <p className="mt-1 break-all font-mono text-lg text-white">{user.email}</p>
          <form action={signOutAction} className="mt-6">
            <button type="submit" className={buttonClass("secondary")}><LogOut aria-hidden className="size-4" />Sign out</button>
          </form>
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
          Deleting your account permanently removes your model connection, every analyzed entry and your correction history,
          and signs you out. This can&apos;t be undone.
        </p>
        <DeleteAccountForm email={user.email} />
      </Card>
    </div>
  );
}
