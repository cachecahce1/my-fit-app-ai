"use client";
// TODAY — the daily cockpit: rings, weight, habits, supplements, quick links.
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { todayIST, isoDow, shiftDate, planWeek, phaseLabel } from "@/lib/plan";
import {
  usePlan,
  useDailyActivity,
  useUpsertActivity,
  useNutritionDay,
  useStepTarget,
  useWeightTrend,
  useBodyMetric,
  useUpsertBodyMetric,
} from "@/lib/data";
import { useState } from "react";

const HABITS = [
  { key: "morning_light", label: "☀️ Morning light" },
  { key: "caffeine_cutoff_respected", label: "☕ Caffeine cutoff" },
  { key: "posture_routine", label: "🧍 Posture routine" },
  { key: "ab_vacuums", label: "🌀 Ab vacuums" },
  { key: "bowel_movement", label: "✅ Gut" },
] as const;

function HabitsCard({ date }: { date: string }) {
  const qc = useQueryClient();
  const { data: habits } = useQuery({
    queryKey: ["habits", date],
    queryFn: async () => {
      const { data } = await supabase().from("habit_logs").select("*").eq("log_date", date).maybeSingle();
      return data;
    },
  });

  const toggle = useMutation({
    mutationFn: async (key: string) => {
      const { data: u } = await supabase().auth.getUser();
      const current = habits?.[key as keyof typeof habits] === true;
      const { error } = await supabase()
        .from("habit_logs")
        .upsert(
          { user_id: u.user!.id, log_date: date, [key]: !current },
          { onConflict: "user_id,log_date" }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits", date] }),
  });

  return (
    <section className="card rise rise-5 p-4">
      <p className="label mb-3">Daily habits</p>
      <div className="flex flex-wrap gap-2">
        {HABITS.map((h) => {
          const on = habits?.[h.key as keyof typeof habits] === true;
          return (
            <button
              key={h.key}
              onClick={() => toggle.mutate(h.key)}
              className={`tap rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                on ? "border-ok bg-ok-soft text-ok" : "border-line bg-surface text-mut"
              }`}
            >
              {h.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SleepCard({ date }: { date: string }) {
  const qc = useQueryClient();
  const [bed, setBed] = useState("00:45");
  const [wake, setWake] = useState("08:30");

  const { data: sleep } = useQuery({
    queryKey: ["sleep", date],
    queryFn: async () => {
      const { data } = await supabase().from("sleep_logs").select("*").eq("log_date", date).maybeSingle();
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase().auth.getUser();
      // bed time before ~noon means "after midnight" → same day as wake
      const [bh, bm] = bed.split(":").map(Number);
      const [wh, wm] = wake.split(":").map(Number);
      const bedDate = bh >= 12 ? shiftDate(date, -1) : date;
      const bedISO = `${bedDate}T${bed}:00+05:30`;
      const wakeISO = `${date}T${wake}:00+05:30`;
      let duration = (wh * 60 + wm) - (bh * 60 + bm);
      if (duration <= 0) duration += 24 * 60;
      const { error } = await supabase().from("sleep_logs").upsert(
        {
          user_id: u.user!.id,
          log_date: date,
          bed_time: bedISO,
          wake_time: wakeISO,
          duration_min: duration,
        },
        { onConflict: "user_id,log_date" }
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sleep", date] }),
  });

  if (sleep) {
    const h = Math.floor((sleep.duration_min ?? 0) / 60);
    const m = (sleep.duration_min ?? 0) % 60;
    return (
      <section className="card rise rise-4 flex items-center justify-between p-4">
        <p className="label">Sleep</p>
        <p className="display text-2xl font-bold">
          {h}h {m > 0 ? `${m}m` : ""}
          <span className={`ml-2 text-sm ${(sleep.duration_min ?? 0) >= 420 ? "text-ok" : "text-warn"}`}>
            {(sleep.duration_min ?? 0) >= 420 ? "✓ 7h+" : "< 7h"}
          </span>
        </p>
      </section>
    );
  }

  return (
    <section className="card rise rise-4 p-4">
      <p className="label mb-2">Sleep last night</p>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <p className="mb-1 text-[10px] text-faint">BED</p>
          <input type="time" value={bed} onChange={(e) => setBed(e.target.value)} className="w-full rounded-xl bg-raised px-3 py-2 text-sm outline-none" />
        </div>
        <div className="flex-1">
          <p className="mb-1 text-[10px] text-faint">WAKE</p>
          <input type="time" value={wake} onChange={(e) => setWake(e.target.value)} className="w-full rounded-xl bg-raised px-3 py-2 text-sm outline-none" />
        </div>
        <button onClick={() => save.mutate()} className="tap mt-4 rounded-xl bg-ember-soft px-4 py-2 text-sm font-bold text-ember">
          Log
        </button>
      </div>
    </section>
  );
}

function Ring({
  value,
  target,
  label,
  unit,
  color,
}: {
  value: number;
  target: number;
  label: string;
  unit: string;
  color: string;
}) {
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-[76px] w-[76px]">
        <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
          <circle cx="38" cy="38" r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
          <circle
            cx="38"
            cy="38"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.2,0.7,0.2,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="display text-lg font-bold leading-none">{Math.round(value)}</span>
          <span className="text-[9px] text-faint">{unit}</span>
        </div>
      </div>
      <span className="label">{label}</span>
    </div>
  );
}

export default function Today() {
  const date = todayIST();
  const dow = isoDow(date);
  const { plan } = usePlan();
  const { data: activity } = useDailyActivity(date);
  const upsertActivity = useUpsertActivity(date);
  const { data: nutrition } = useNutritionDay(date);
  const { data: stepTarget } = useStepTarget(date);
  const { data: trend } = useWeightTrend(14);
  const { data: todayBody } = useBodyMetric(date);
  const upsertBody = useUpsertBodyMetric(date);
  const [weightInput, setWeightInput] = useState("");
  const qc = useQueryClient();

  const { data: todayTemplate } = useQuery({
    queryKey: ["template", dow],
    queryFn: async () => {
      const { data } = await supabase()
        .from("workout_templates")
        .select("id, name, focus")
        .eq("day_of_week", dow)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
  });

  const { data: todaySession } = useQuery({
    queryKey: ["sessionToday", date],
    queryFn: async () => {
      const { data } = await supabase()
        .from("workout_sessions")
        .select("id, ended_at")
        .eq("log_date", date)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: supplements } = useQuery({
    queryKey: ["supps", date],
    queryFn: async () => {
      const [{ data: supps }, { data: logs }] = await Promise.all([
        supabase().from("supplements").select("*").eq("is_active", true).order("name"),
        supabase().from("supplement_logs").select("supplement_id, taken").eq("log_date", date),
      ]);
      return {
        supps: supps ?? [],
        taken: new Set((logs ?? []).filter((l) => l.taken).map((l) => l.supplement_id)),
      };
    },
  });

  const toggleSupp = useMutation({
    mutationFn: async ({ id, taken }: { id: string; taken: boolean }) => {
      const { data: u } = await supabase().auth.getUser();
      const { error } = await supabase()
        .from("supplement_logs")
        .upsert(
          { user_id: u.user!.id, supplement_id: id, log_date: date, taken },
          { onConflict: "user_id,supplement_id,log_date" }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supps", date] }),
  });

  const latest = trend?.at(-1);
  const prevWeek = trend && trend.length >= 8 ? trend.at(-8) : undefined;
  const water = activity?.water_ml ?? 0;
  const steps = activity?.steps ?? 0;

  const dateLabel = new Date(date + "T12:00:00Z").toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  function saveWeight() {
    const w = parseFloat(weightInput);
    if (!w || w < 30 || w > 200) return;
    // Typo guard: >3 kg from 7-day average asks for confirmation (spec §6.3)
    if (latest?.avg_7day && Math.abs(w - latest.avg_7day) > 3) {
      if (!confirm(`${w} kg is far from your 7-day average (${latest.avg_7day} kg). Save anyway?`)) return;
    }
    upsertBody.mutate({ weight_kg: w });
    setWeightInput("");
  }

  return (
    <div className="space-y-4">
      <header className="rise rise-1">
        <div className="flex items-center justify-between">
          <p className="label text-ember">{dateLabel}</p>
          <span className="flex items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${
                phaseLabel(planWeek(date)).includes("DELOAD")
                  ? "border-warn text-warn"
                  : "border-line text-mut"
              }`}
            >
              Week {planWeek(date)} · {phaseLabel(planWeek(date))}
            </span>
            <Link href="/settings" className="tap -m-2 p-2 text-faint" aria-label="Settings">
              ⚙
            </Link>
          </span>
        </div>
        <h1 className="display text-4xl font-bold uppercase leading-none">
          {todayTemplate ? todayTemplate.name : "Rest day"}
        </h1>
        {todayTemplate?.focus && <p className="mt-1 text-sm text-mut">{todayTemplate.focus}</p>}
      </header>

      {/* Start / resume workout */}
      {todayTemplate && (
        <Link
          href={
            todaySession && !todaySession.ended_at
              ? `/workout/session/${todaySession.id}`
              : `/workout/${todayTemplate.id}`
          }
          className="rise rise-1 tap display block rounded-2xl bg-ember py-4 text-center text-xl font-bold uppercase tracking-wide text-bg"
        >
          {todaySession ? (todaySession.ended_at ? "Session done ✓" : "Resume session →") : "View today's workout →"}
        </Link>
      )}
      {dow === 7 && (
        <div className="card rise rise-1 p-4 text-sm text-mut">
          45–60 min outdoor morning walk · stretching · Sunday measurements in{" "}
          <Link href="/body" className="text-ember">
            Body →
          </Link>
        </div>
      )}

      {/* Rings */}
      <section className="card rise rise-2 flex justify-between p-4">
        <Ring value={nutrition?.kcal ?? 0} target={plan.kcal_target} label="kcal" unit={`/ ${plan.kcal_target}`} color="var(--ember)" />
        <Ring value={nutrition?.protein_g ?? 0} target={plan.protein_g_target} label="Protein" unit={`/ ${plan.protein_g_target}g`} color="var(--ok)" />
        <Ring value={water / 1000} target={(plan.water_ml_target ?? 3000) / 1000} label="Water" unit="litres" color="var(--water)" />
        <Ring value={steps} target={stepTarget ?? 4000} label="Steps" unit={`/ ${((stepTarget ?? 4000) / 1000).toFixed(0)}k`} color="var(--warn)" />
      </section>

      {/* Water / steps quick log */}
      <section className="rise rise-3 grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="label mb-2">Water</p>
          <div className="flex gap-2">
            {[250, 500].map((ml) => (
              <button
                key={ml}
                onClick={() => upsertActivity.mutate({ water_ml: water + ml })}
                className="tap flex-1 rounded-xl bg-raised py-2.5 text-sm font-semibold text-water"
              >
                +{ml}
              </button>
            ))}
          </div>
        </div>
        <div className="card p-4">
          <p className="label mb-2">Steps</p>
          <input
            type="number"
            inputMode="numeric"
            placeholder={String(steps || "0")}
            className="w-full rounded-xl bg-raised px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-warn"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = parseInt((e.target as HTMLInputElement).value);
                if (v >= 0) upsertActivity.mutate({ steps: v });
                (e.target as HTMLInputElement).value = "";
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        </div>
      </section>

      {/* Weight */}
      <section className="card rise rise-4 p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="label">7-day average</p>
            <p className="display text-4xl font-bold">
              {latest?.avg_7day ?? "—"}
              <span className="ml-1 text-base font-medium text-faint">kg</span>
            </p>
            {prevWeek?.avg_7day != null && latest?.avg_7day != null && (
              <p className={`text-xs ${latest.avg_7day - prevWeek.avg_7day <= 0 ? "text-ok" : "text-warn"}`}>
                {(latest.avg_7day - prevWeek.avg_7day).toFixed(2)} kg vs last week
              </p>
            )}
          </div>
          {todayBody?.weight_kg ? (
            <p className="text-sm text-mut">
              today: <span className="text-ink">{todayBody.weight_kg}</span>
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                placeholder="kg"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveWeight()}
                className="w-20 rounded-xl bg-raised px-3 py-2.5 text-right outline-none focus:ring-1 focus:ring-ember"
              />
              <button onClick={saveWeight} className="tap rounded-xl bg-ember-soft px-3 py-2.5 text-sm font-bold text-ember">
                Log
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Sleep */}
      <SleepCard date={date} />

      {/* Daily habits — the plan's non-lifting protocol */}
      <HabitsCard date={date} />

      {/* Supplements */}
      <section className="card rise rise-5 p-4">
        <p className="label mb-3">Supplements</p>
        <div className="flex flex-wrap gap-2">
          {supplements?.supps.map((s) => {
            const on = supplements.taken.has(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggleSupp.mutate({ id: s.id, taken: !on })}
                className={`tap rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                  on ? "border-ok bg-ok-soft text-ok" : "border-line bg-surface text-mut"
                }`}
              >
                {on ? "✓ " : ""}
                {s.name}
              </button>
            );
          })}
          {supplements && supplements.supps.length === 0 && (
            <p className="text-sm text-faint">Run seed.sql to load your stack.</p>
          )}
        </div>
      </section>
    </div>
  );
}
