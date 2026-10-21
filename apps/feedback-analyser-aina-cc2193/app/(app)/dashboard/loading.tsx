import { cardClass, pageClass } from "@/components/kit";

export default function DashboardLoading() {
  return (
    <div className={`${pageClass} space-y-8`} aria-busy="true" aria-label="Loading dashboard">
      <div className="space-y-2"><div className="h-3 w-24 animate-pulse rounded bg-white/5" /><div className="h-8 w-48 animate-pulse rounded bg-white/10" /></div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className={`${cardClass} h-24 animate-pulse p-5 sm:p-5`} />)}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className={`${cardClass} space-y-3`}>
            {Array.from({ length: 5 }, (_, j) => <div key={j} className="h-5 animate-pulse rounded bg-white/5" style={{ width: `${90 - j * 14}%` }} />)}
          </div>
        ))}
      </div>
      <div className={`${cardClass} h-72 animate-pulse`} />
    </div>
  );
}
