"use client";

import { useState } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { buttonClass, cardClass } from "@/components/kit";
import { pct } from "@/lib/format";

type Datum = { key: string; label: string; value: number; color: string };

export function BreakdownChart({ title, data, total }: { title: string; data: Datum[]; total: number }) {
  const [showTable, setShowTable] = useState(false);
  const id = `chart-${title.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <section className={cardClass} aria-labelledby={id}>
      <div className="mb-4 flex items-center justify-between">
        <h2 id={id} className="font-semibold text-white">{title}</h2>
        <button type="button" aria-pressed={showTable} onClick={() => setShowTable((v) => !v)} className={buttonClass("ghost", "sm")}>
          {showTable ? <><BarChart3 aria-hidden className="size-4" />Chart</> : <><Table2 aria-hidden className="size-4" />Table</>}
        </button>
      </div>
      {showTable ? (
        <table className="w-full text-sm">
          <caption className="sr-only">{title}</caption>
          <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="pb-2 font-medium">Label</th><th className="pb-2 text-right font-medium">Count</th><th className="pb-2 text-right font-medium">Share</th>
          </tr></thead>
          <tbody className="divide-y divide-white/5">
            {data.map((d) => (
              <tr key={d.key}>
                <td className="py-2 text-slate-200"><span className="mr-2 inline-block size-2 rounded-full" style={{ background: d.color }} />{d.label}</td>
                <td className="py-2 text-right tabular-nums text-slate-300">{d.value}</td>
                <td className="py-2 text-right tabular-nums text-slate-400">{pct(d.value, total)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ height: data.length * 40 + 8 }} role="img"
          aria-label={`${title}: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }} barCategoryGap={10}>
              <XAxis type="number" hide allowDecimals={false} domain={[0, "dataMax"]} />
              <YAxis type="category" dataKey="label" width={128} tickLine={false} axisLine={false} tick={{ fill: "#cbd5e1", fontSize: 13 }} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                content={({ active, payload }) => {
                  const d = active && payload?.length ? (payload[0].payload as Datum) : null;
                  return d ? (
                    <div className="rounded-lg border border-white/10 bg-slate-900/95 px-3 py-2 text-xs text-slate-200 shadow-xl">
                      <p className="font-medium">{d.label}</p>
                      <p className="text-slate-400">{d.value} entries · {pct(d.value, total)}%</p>
                    </div>
                  ) : null;
                }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
                {data.map((d) => <Cell key={d.key} fill={d.color} />)}
                <LabelList dataKey="value" position="right" fill="#cbd5e1" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
