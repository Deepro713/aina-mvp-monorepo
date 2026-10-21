import { AlertCircle, AlertTriangle, CheckCircle2, ChevronRight, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const pageClass = "mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 sm:py-12";
export const cardClass = "rounded-2xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl sm:p-8";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(cardClass, className)} {...props} />;
}

const BTN = {
  primary: "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500",
  secondary: "border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10",
  ghost: "text-slate-300 hover:bg-white/5 hover:text-white",
  danger: "bg-rose-600 text-white shadow-lg shadow-rose-600/20 hover:bg-rose-500",
} as const;

export function buttonClass(variant: keyof typeof BTN = "primary", size: "sm" | "md" | "lg" = "md") {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
    "disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" ? "h-8 px-3 text-[13px]" : size === "lg" ? "h-11 px-5 text-[15px]" : "h-10 px-4 text-sm",
    BTN[variant],
  );
}

export const inputClass = cn(
  "block w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 shadow-inner",
  "placeholder:text-slate-500 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40",
  "disabled:opacity-60 aria-[invalid=true]:border-rose-500/70 aria-[invalid=true]:focus:ring-rose-500/30",
);
export const labelClass = "mb-1.5 block text-sm font-medium text-slate-200";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-hidden className={cn("size-4 animate-spin", className)} />;
}

const PILL = {
  emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  rose: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  slate: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  indigo: "border-indigo-400/30 bg-indigo-500/10 text-indigo-200",
} as const;
export type PillTone = keyof typeof PILL;
export const pillTones = PILL;

export function Pill({ tone = "slate", className, children }: { tone?: PillTone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium", PILL[tone], className)}>
      {children}
    </span>
  );
}

const ALERT = {
  error: { box: "border-rose-500/40 bg-rose-500/10 text-rose-100", Icon: AlertCircle, icon: "text-rose-400" },
  success: { box: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100", Icon: CheckCircle2, icon: "text-emerald-400" },
  warning: { box: "border-amber-500/40 bg-amber-500/10 text-amber-100", Icon: AlertTriangle, icon: "text-amber-400" },
  info: { box: "border-indigo-400/30 bg-indigo-500/10 text-indigo-100", Icon: Info, icon: "text-indigo-300" },
} as const;

export function Alert({ tone = "info", title, children, action, className }: {
  tone?: keyof typeof ALERT; title?: React.ReactNode; children?: React.ReactNode; action?: React.ReactNode; className?: string;
}) {
  const t = ALERT[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border px-4 py-3 text-sm", t.box, className)}>
      <t.Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", t.icon)} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn("opacity-90", title && "mt-0.5")}>{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function FieldError({ id, message }: { id?: string; message?: string | null }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1.5 text-[13px] text-rose-300">
      <AlertCircle aria-hidden className="size-3.5 shrink-0" />
      {message}
    </p>
  );
}

export function PageHeader({ crumbs, title, description, actions }: {
  crumbs?: string[]; title: string; description?: React.ReactNode; actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 text-xs text-slate-500">
            {crumbs.map((c, i) => (
              <span key={c} className="flex items-center gap-1">
                {i > 0 && <ChevronRight aria-hidden className="size-3" />}
                <span className={i === crumbs.length - 1 ? "text-slate-300" : undefined}>{c}</span>
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Orbs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-48 left-1/2 h-[480px] w-[760px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="absolute -right-40 top-32 h-[360px] w-[360px] rounded-full bg-fuchsia-600/10 blur-3xl" />
    </div>
  );
}
