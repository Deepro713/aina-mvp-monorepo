import { ChevronDown } from "lucide-react";
import { Pill, pillTones } from "@/components/kit";
import type { Category, Sentiment } from "@/lib/db/schema";
import { CATEGORY_KEYS, CATEGORY_META, SENTIMENT_KEYS, SENTIMENT_META } from "@/lib/labels";
import { cn } from "@/lib/utils";

const Dot = ({ color }: { color: string }) => (
  <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: color }} />
);

export function SentimentBadge({ value }: { value: Sentiment }) {
  const m = SENTIMENT_META[value];
  return <Pill tone={m.tone}><Dot color={m.color} />{m.label}</Pill>;
}

export function CategoryBadge({ value }: { value: Category }) {
  const m = CATEGORY_META[value];
  return <Pill tone="slate"><Dot color={m.color} />{m.label}</Pill>;
}

function PillSelect<T extends string>({ value, options, onChange, label, toneClass, dotColor, disabled }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
  label: string; toneClass: string; dotColor: string; disabled?: boolean;
}) {
  return (
    <div className={cn("relative inline-flex items-center rounded-full border", toneClass, disabled && "opacity-60")}>
      <span aria-hidden className="pointer-events-none absolute left-2.5 size-1.5 rounded-full" style={{ background: dotColor }} />
      <select
        aria-label={label} value={value} disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className="cursor-pointer appearance-none rounded-full bg-transparent py-1 pl-6 pr-7 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-wait"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-2 size-3" />
    </div>
  );
}

export function SentimentSelect({ value, onChange, disabled }: { value: Sentiment; onChange: (v: Sentiment) => void; disabled?: boolean }) {
  const m = SENTIMENT_META[value];
  return (
    <PillSelect label="Sentiment" value={value} onChange={onChange} disabled={disabled}
      toneClass={pillTones[m.tone]} dotColor={m.color}
      options={SENTIMENT_KEYS.map((k) => ({ value: k, label: SENTIMENT_META[k].label }))} />
  );
}

export function CategorySelect({ value, onChange, disabled }: { value: Category; onChange: (v: Category) => void; disabled?: boolean }) {
  return (
    <PillSelect label="Category" value={value} onChange={onChange} disabled={disabled}
      toneClass={pillTones.slate} dotColor={CATEGORY_META[value].color}
      options={CATEGORY_KEYS.map((k) => ({ value: k, label: CATEGORY_META[k].label }))} />
  );
}
