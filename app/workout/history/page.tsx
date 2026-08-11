"use client";
// EXERCISE HISTORY — per-exercise progression: top-set weight over time.
// Rising numbers during a cut are the proof muscle is being kept.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/lib/supabase/client";

type ProgressionRow = {
  exercise_id: string;
  exercise_name: string;
  log_date: string;
  top_weight_kg: number | null;
  top_reps: number | null;
  volume_kg: number | null;
  working_sets: number | null;
  avg_rpe: number | null;
};

export default function ExerciseHistory() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const { data: rows } = useQuery({
    queryKey: ["progressionAll"],
    queryFn: async () => {
      const { data } = await supabase()
        .from("v_exercise_progression")
        .select("exercise_id, exercise_name, log_date, top_weight_kg, top_reps, volume_kg, working_sets, avg_rpe")
        .order("log_date");
      return (data ?? []) as ProgressionRow[];
    },
  });

  const byExercise = useMemo(() => {
    const m = new Map<string, ProgressionRow[]>();
    for (const r of rows ?? []) {
      if (!m.has(r.exercise_id)) m.set(r.exercise_id, []);
      m.get(r.exercise_id)!.push(r);
    }
    // most-trained first
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [rows]);

  const active = selected ?? byExercise[0]?.[0] ?? null;
  const history = byExercise.find(([id]) => id === active)?.[1] ?? [];
  const first = history[0];
  const last = history.at(-1);
  const gain =
    first?.top_weight_kg != null && last?.top_weight_kg != null
      ? Number(last.top_weight_kg) - Number(first.top_weight_kg)
      : null;

  const chartData = history.map((r) => ({
    date: r.log_date.slice(5),
    weight: r.top_weight_kg != null ? Number(r.top_weight_kg) : null,
  }));

  return (
    <div className="space-y-4">
      <header className="rise rise-1">
        <button onClick={() => router.push("/workout")} className="tap mb-1 text-sm text-mut">
          ← Train
        </button>
        <h1 className="display text-4xl font-bold uppercase leading-none">Exercise history</h1>
        <p className="mt-1 text-sm text-mut">
          Only clean solo working sets count — same rule as the log.
        </p>
      </header>

      {byExercise.length === 0 ? (
        <p className="card rise rise-2 p-4 text-sm text-faint">
          Nothing here yet — log your first session and every exercise shows up automatically.
        </p>
      ) : (
        <>
          {/* Exercise picker */}
          <div className="rise rise-2 flex gap-2 overflow-x-auto pb-1">
            {byExercise.map(([id, rs]) => (
              <button
                key={id}
                onClick={() => setSelected(id)}
                className={`tap shrink-0 rounded-full px-3.5 py-2 text-sm font-medium ${
                  id === active ? "bg-ember text-bg" : "card text-mut"
                }`}
              >
                {rs[0].exercise_name}
              </button>
            ))}
          </div>

          {/* Chart */}
          <section className="card rise rise-3 p-4">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="label">Top set weight</p>
                <p className="display text-3xl font-bold">
                  {last?.top_weight_kg != null ? Number(last.top_weight_kg) : "—"}
                  <span className="ml-1 text-sm text-faint">kg × {last?.top_reps ?? "—"}</span>
                </p>
              </div>
              {gain !== null && history.length > 1 && (
                <p className={`display text-lg font-bold ${gain > 0 ? "text-ok" : gain < 0 ? "text-warn" : "text-mut"}`}>
                  {gain > 0 ? "+" : ""}
                  {gain} kg
                  <span className="ml-1 text-[10px] font-medium text-faint">since {first!.log_date.slice(5)}</span>
                </p>
              )}
            </div>
            {chartData.length >= 2 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "var(--faint)", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={26} />
                  <YAxis domain={["dataMin - 2.5", "dataMax + 2.5"]} tick={{ fill: "var(--faint)", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--raised)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: "var(--mut)" }}
                  />
                  <Line type="stepAfter" dataKey="weight" name="kg" stroke="var(--ember)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--ember)" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-faint">
                One session logged — the line appears from the second.
              </p>
            )}
          </section>

          {/* Session-by-session log */}
          <section className="rise rise-4 space-y-1.5">
            {[...history].reverse().map((r) => (
              <div key={r.log_date} className="card flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-mut">{r.log_date}</span>
                <span>
                  <span className="display font-bold">
                    {r.top_weight_kg != null ? `${Number(r.top_weight_kg)} kg` : "bw"} × {r.top_reps}
                  </span>
                  <span className="ml-2 text-xs text-faint">
                    {r.working_sets} sets · {Math.round(Number(r.volume_kg ?? 0)).toLocaleString()} kg
                    {r.avg_rpe != null && <> · RPE {Number(r.avg_rpe).toFixed(1)}</>}
                  </span>
                </span>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
