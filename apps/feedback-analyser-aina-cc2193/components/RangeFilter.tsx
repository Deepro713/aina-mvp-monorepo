import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Range } from "@/lib/validation";

const OPTIONS: { value: Range; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All" },
];

export function RangeFilter({ value }: { value: Range }) {
  return (
    <nav aria-label="Date range" className="inline-flex rounded-lg border border-white/10 bg-slate-900/60 p-1">
      {OPTIONS.map((o) => {
        const active = o.value === value;
        return (
          <Link key={o.value} href={o.value === "all" ? "/dashboard" : `/dashboard?range=${o.value}`} scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
              active ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white")}>
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}
