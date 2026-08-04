"use client";
// BODY — weight trend (7-day avg is the number that matters), tape
// measurements (Sunday prompt), monthly extras.
import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { todayIST, isoDow } from "@/lib/plan";
import { useWeightTrend, useBodyMetric, useUpsertBodyMetric } from "@/lib/data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

const TAPE_FIELDS = [
  { key: "waist_cm", label: "Waist (navel)", cadence: "weekly" },
  { key: "mid_abdomen_cm", label: "Mid-abdomen", cadence: "weekly" },
  { key: "hips_cm", label: "Hips", cadence: "weekly" },
  { key: "neck_cm", label: "Neck", cadence: "monthly" },
  { key: "bicep_cm", label: "Bicep", cadence: "monthly" },
  { key: "thigh_cm", label: "Thigh", cadence: "monthly" },
  { key: "calf_cm", label: "Calf", cadence: "monthly" },
  { key: "shoulder_circumference_cm", label: "Shoulder circumference", cadence: "monthly" },
  { key: "bia_body_fat_pct", label: "BIA body-fat %", cadence: "monthly" },
] as const;

export default function Body() {
  const date = todayIST();
  const isSunday = isoDow(date) === 7;
  const { data: trend } = useWeightTrend(90);
  const { data: today } = useBodyMetric(date);
  const upsert = useUpsertBodyMetric(date);
  const [showMonthly, setShowMonthly] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const { data: lastWaist } = useQuery({
    queryKey: ["lastWaist"],
    queryFn: async () => {
      const { data } = await supabase()
        .from("body_metrics")
        .select("log_date, waist_cm")
        .not("waist_cm", "is", null)
        .order("log_date", { ascending: false })
        .limit(2);
      return data ?? [];
    },
  });

  const latest = trend?.at(-1);
  const chartData = (trend ?? []).map((r) => ({
    date: r.log_date.slice(5),
    weight: Number(r.weight_kg),
    avg: Number(r.avg_7day),
  }));

  function saveField(key: string) {
    const v = parseFloat(drafts[key]);
    if (!v) return;
    upsert.mutate({ [key]: v });
    setDrafts((d) => ({ ...d, [key]: "" }));
  }

  const fields = TAPE_FIELDS.filter((f) => f.cadence === "weekly" || showMonthly);

  return (
    <div className="space-y-4">
      <header className="rise rise-1">
        <p className="label text-ember">Body</p>
        <h1 className="display text-4xl font-bold uppercase leading-none">The trend line</h1>
      </header>

      {isSunday && (
        <div className="rise rounded-xl border border-ember/40 bg-ember-soft px-4 py-3 text-sm text-ember">
          Sunday ritual: weigh in, then tape waist · mid-abdomen · hips (post-toilet, pre-food, relaxed
          after exhale).
        </div>
      )}

      {/* Weight chart — raw line de-emphasised, 7-day avg is the story */}
      <section className="card rise rise-2 p-4">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="label">7-day average</p>
            <p className="display text-4xl font-bold">
              {latest?.avg_7day ?? "—"}
              <span className="ml-1 text-base text-faint">kg</span>
            </p>
          </div>
          <div className="text-right text-xs text-mut">
            {lastWaist?.[0] && (
              <>
                waist {Number(lastWaist[0].waist_cm)} cm
                {lastWaist[1] && (
                  <span className={Number(lastWaist[0].waist_cm) <= Number(lastWaist[1].waist_cm) ? "text-ok" : "text-warn"}>
                    {" "}
                    ({(Number(lastWaist[0].waist_cm) - Number(lastWaist[1].waist_cm)).toFixed(1)})
                  </span>
                )}
              </>
            )}
          </div>
        </div>
        {chartData.length >= 2 ? (
          <ResponsiveContainer width="100%" height={190}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "var(--faint)", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis domain={["dataMin - 0.5", "dataMax + 0.5"]} tick={{ fill: "var(--faint)", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--raised)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: "var(--mut)" }}
              />
              <Line type="monotone" dataKey="weight" name="daily" stroke="var(--faint)" strokeWidth={1} dot={false} strokeOpacity={0.5} />
              <Line type="monotone" dataKey="avg" name="7-day avg" stroke="var(--ember)" strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-10 text-center text-sm text-faint">
            Log a few mornings of weight and the trend appears here.
          </p>
        )}
      </section>

      {/* Measurements */}
      <section className="card rise rise-3 p-4">
        <div className="flex items-center justify-between">
          <p className="label">Tape — {date}</p>
          <button onClick={() => setShowMonthly(!showMonthly)} className="tap text-xs text-mut">
            {showMonthly ? "weekly only" : "+ monthly set"}
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {fields.map((f) => {
            const existing = today?.[f.key as keyof typeof today] as number | null | undefined;
            return (
              <div key={f.key} className="flex items-center justify-between gap-3">
                <p className="text-sm text-mut">{f.label}</p>
                {existing != null ? (
                  <p className="display text-lg font-bold">
                    {Number(existing)}
                    <span className="ml-1 text-xs text-faint">{f.key === "bia_body_fat_pct" ? "%" : "cm"}</span>
                  </p>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      value={drafts[f.key] ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [f.key]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && saveField(f.key)}
                      className="w-20 rounded-lg bg-raised px-2.5 py-2 text-right text-sm outline-none focus:ring-1 focus:ring-ember"
                    />
                    <button onClick={() => saveField(f.key)} className="tap rounded-lg bg-ember-soft px-2.5 py-2 text-xs font-bold text-ember">
                      ✓
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-faint">
          Weekly = every Sunday. Monthly extras include the shoulder circumference for the V-taper ratio
          (target ≈ 1.6 × waist).
        </p>
      </section>
    </div>
  );
}
