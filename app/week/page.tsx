"use client";
// WEEK — the Sunday operating system: adherence vs the contract, the plan's
// decision-rule verdict, and the coach export for Claude.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { todayIST, weekStart, shiftDate } from "@/lib/plan";
import { usePlan } from "@/lib/data";

type Verdict = {
  code: "on_track" | "recomp" | "too_fast" | "stalled" | "insufficient";
  title: string;
  detail: string;
  color: string;
};

export default function Week() {
  const today = todayIST();
  const ws = weekStart(today);
  const we = shiftDate(ws, 6);
  const prevWs = shiftDate(ws, -7);
  const { plan } = usePlan();
  const [exportJson, setExportJson] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data } = useQuery({
    queryKey: ["weekData", ws],
    queryFn: async () => {
      const [trend, waists, sessions, nutrition, activity, sleep, stepTarget] = await Promise.all([
        supabase().from("v_weight_trend").select("log_date, avg_7day").gte("log_date", shiftDate(ws, -8)).order("log_date"),
        supabase().from("body_metrics").select("log_date, waist_cm").not("waist_cm", "is", null).gte("log_date", shiftDate(ws, -15)).order("log_date"),
        supabase().from("workout_sessions").select("id, log_date").gte("log_date", ws).lte("log_date", we).is("deleted_at", null),
        supabase().from("v_daily_nutrition").select("log_date, kcal, protein_g").gte("log_date", ws).lte("log_date", we),
        supabase().from("daily_activity").select("log_date, steps").gte("log_date", ws).lte("log_date", we),
        supabase().from("sleep_logs").select("log_date, duration_min").gte("log_date", ws).lte("log_date", we),
        supabase().from("step_targets").select("daily_steps, effective_from").lte("effective_from", today).order("effective_from", { ascending: false }).limit(1).maybeSingle(),
      ]);
      return {
        trend: trend.data ?? [],
        waists: waists.data ?? [],
        sessions: sessions.data ?? [],
        nutrition: nutrition.data ?? [],
        activity: activity.data ?? [],
        sleep: sleep.data ?? [],
        stepTarget: stepTarget.data?.daily_steps ?? 4000,
      };
    },
  });

  const stats = useMemo(() => {
    if (!data) return null;
    const avgOn = (d: string) => data.trend.filter((t) => t.log_date <= d).at(-1)?.avg_7day as number | undefined;
    const thisAvg = avgOn(we) ?? avgOn(today);
    const lastAvg = data.trend.filter((t) => t.log_date <= shiftDate(prevWs, 6)).at(-1)?.avg_7day as number | undefined;
    const avgDelta = thisAvg != null && lastAvg != null ? thisAvg - lastAvg : null;

    const latestWaist = data.waists.at(-1);
    const waistTwoWeeksAgo = data.waists.filter((w) => w.log_date <= shiftDate(today, -13)).at(-1);
    const waistDelta2w =
      latestWaist && waistTwoWeeksAgo ? Number(latestWaist.waist_cm) - Number(waistTwoWeeksAgo.waist_cm) : null;

    const proteinDays = data.nutrition.filter((n) => Number(n.protein_g) >= plan.protein_g_target).length;
    const kcalDays = data.nutrition.filter(
      (n) => Number(n.kcal) >= (plan.kcal_min ?? 0) - 100 && Number(n.kcal) <= (plan.kcal_max ?? 9999) + 100
    ).length;
    const stepDays = data.activity.filter((a) => (a.steps ?? 0) >= data.stepTarget).length;
    const sleepNights = data.sleep.filter((s) => (s.duration_min ?? 0) >= 420).length;
    const avgSleepMin = data.sleep.length
      ? data.sleep.reduce((a, s) => a + (s.duration_min ?? 0), 0) / data.sleep.length
      : null;

    return {
      thisAvg,
      lastAvg,
      avgDelta,
      waistDelta2w,
      sessions: data.sessions.length,
      proteinDays,
      kcalDays,
      stepDays,
      sleepNights,
      avgSleepMin,
    };
  }, [data, plan, we, today, prevWs]);

  const verdict: Verdict = useMemo(() => {
    if (!stats || stats.avgDelta == null)
      return {
        code: "insufficient",
        title: "Not enough data yet",
        detail: "Log daily weight for two weeks and the Sunday verdict runs automatically.",
        color: "text-mut",
      };
    const d = stats.avgDelta;
    if (d <= -0.4 && d >= -0.7)
      return { code: "on_track", title: "On track — change nothing", detail: `7-day average down ${Math.abs(d).toFixed(2)} kg this week, inside the 0.4–0.7 target band.`, color: "text-ok" };
    if (Math.abs(d) < 0.2 && stats.waistDelta2w != null && stats.waistDelta2w <= -1)
      return { code: "recomp", title: "Recomp — change nothing", detail: `Weight flat but waist down ${Math.abs(stats.waistDelta2w).toFixed(1)} cm over 2 weeks. Muscle in, fat out.`, color: "text-ok" };
    if (d < -0.9 && (stats.avgSleepMin ?? 999) < 360)
      return { code: "too_fast", title: "Too fast — add 100–150 kcal from carbs", detail: `Losing ${Math.abs(d).toFixed(2)} kg/week with short sleep. Protect the muscle.`, color: "text-warn" };
    if (d > -0.3 && (stats.waistDelta2w == null || stats.waistDelta2w >= -0.2))
      return { code: "stalled", title: "Possible stall — run the ladder", detail: "Step 1 is the honesty audit: oil, order-ins, bites, chai sugar, treat creep. One change per week, in order. Never cut protein.", color: "text-warn" };
    return { code: "on_track", title: "Acceptable — keep going", detail: `Down ${Math.abs(d).toFixed(2)} kg/week. Watch next Sunday.`, color: "text-ok" };
  }, [stats]);

  async function runExport() {
    setExporting(true);
    const { data: snap, error } = await supabase().rpc("get_coach_snapshot", {
      p_from: shiftDate(today, -14),
      p_to: today,
    });
    setExporting(false);
    if (!error) setExportJson(JSON.stringify(snap, null, 2));
  }

  const contract = [
    { label: "Sessions", value: stats?.sessions ?? 0, target: plan.sessions_per_week ?? 6 },
    { label: "Protein days", value: stats?.proteinDays ?? 0, target: 7 },
    { label: "kcal in range", value: stats?.kcalDays ?? 0, target: 7 },
    { label: "Step days", value: stats?.stepDays ?? 0, target: 6 },
    { label: "7h+ nights", value: stats?.sleepNights ?? 0, target: 5 },
  ];

  return (
    <div className="space-y-4">
      <header className="rise rise-1">
        <p className="label text-ember">
          Week of {ws} → {we}
        </p>
        <h1 className="display text-4xl font-bold uppercase leading-none">Sunday verdict</h1>
      </header>

      {/* Verdict */}
      <section className="card rise rise-2 p-5">
        <p className={`display text-2xl font-bold uppercase ${verdict.color}`}>{verdict.title}</p>
        <p className="mt-1.5 text-sm text-mut">{verdict.detail}</p>
        {stats?.avgDelta != null && (
          <div className="mt-4 flex gap-6 border-t border-line pt-3 text-sm">
            <div>
              <p className="label">Δ weight</p>
              <p className="display text-xl font-bold">{stats.avgDelta.toFixed(2)} kg</p>
            </div>
            <div>
              <p className="label">Δ waist (2w)</p>
              <p className="display text-xl font-bold">
                {stats.waistDelta2w != null ? `${stats.waistDelta2w.toFixed(1)} cm` : "—"}
              </p>
            </div>
            <div>
              <p className="label">avg sleep</p>
              <p className="display text-xl font-bold">
                {stats.avgSleepMin != null ? `${(stats.avgSleepMin / 60).toFixed(1)}h` : "—"}
              </p>
            </div>
          </div>
        )}
        <p className="mt-3 text-[11px] text-faint">
          The app recommends; you confirm. Verdict mirrors the plan&apos;s decision rules — judge the 7-day
          average, never a single day.
        </p>
      </section>

      {/* Consistency contract */}
      <section className="card rise rise-3 p-4">
        <p className="label mb-3">The contract</p>
        <div className="space-y-2.5">
          {contract.map((c) => {
            const hit = c.value >= c.target;
            return (
              <div key={c.label} className="flex items-center gap-3">
                <p className="w-28 shrink-0 text-sm text-mut">{c.label}</p>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-raised">
                  <div
                    className={`h-full rounded-full ${hit ? "bg-ok" : "bg-ember"}`}
                    style={{ width: `${Math.min((c.value / c.target) * 100, 100)}%`, transition: "width 0.5s" }}
                  />
                </div>
                <p className={`display w-12 text-right text-sm font-bold ${hit ? "text-ok" : ""}`}>
                  {c.value}/{c.target}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Coach export */}
      <section className="card rise rise-4 p-4">
        <p className="label mb-2">Coach export</p>
        <p className="text-sm text-mut">
          A 14-day snapshot (nutrition, sessions, progression, measurements) as JSON — paste it to Claude
          for a full review without answering a single question.
        </p>
        <button
          onClick={runExport}
          disabled={exporting}
          className="tap display mt-3 w-full rounded-xl border border-ember py-3 font-bold uppercase text-ember disabled:opacity-50"
        >
          {exporting ? "Building…" : "Generate snapshot"}
        </button>
        {exportJson && (
          <div className="mt-3">
            <button
              onClick={() => navigator.clipboard.writeText(exportJson)}
              className="tap mb-2 w-full rounded-xl bg-ember-soft py-2.5 text-sm font-bold text-ember"
            >
              Copy to clipboard
            </button>
            <pre className="max-h-64 overflow-auto rounded-xl bg-raised p-3 text-[10px] leading-relaxed text-mut">
              {exportJson}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
}
