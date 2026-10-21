import Link from "next/link";
import { Plug } from "lucide-react";
import { Pill } from "@/components/kit";
import { timeAgo } from "@/lib/format";
import { PROVIDER_META } from "@/lib/labels";
import type { ConnectionDto } from "@/lib/types";

export function ConnectionBadge({ connection }: { connection: ConnectionDto | null }) {
  if (!connection) {
    return (
      <Link href="/connect" className="hidden sm:block">
        <Pill tone="amber"><Plug aria-hidden className="size-3" />No model connected</Pill>
      </Link>
    );
  }
  return (
    <Link
      href="/connect" title="Change model connection"
      className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-3 pr-1 text-xs text-slate-300 transition hover:bg-white/10 lg:flex"
    >
      <span className="font-medium text-slate-100">{PROVIDER_META[connection.provider].label}</span>
      <span className="max-w-[140px] truncate font-mono text-slate-400">{connection.model_id}</span>
      {connection.last_tested_at
        ? <Pill tone="emerald">Tested {timeAgo(connection.last_tested_at)}</Pill>
        : <Pill tone="amber">Untested</Pill>}
    </Link>
  );
}
