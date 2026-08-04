"use client";
// ACTIVE SESSION — the most important screen. Every set is saved on tap.
// Prefills from last session, shows "beat this", runs the progression engine,
// auto rest timer, session summary on finish.
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { suggestNext, type Suggestion } from "@/lib/progression";
import { todayIST } from "@/lib/plan";

type TemplateExercise = {
  id: string;
  sort_order: number;
  target_sets: number;
  rep_min: number;
  rep_max: number;
  target_rpe: number | null;
  rest_seconds: number | null;
  start_weight_kg: number | null;
  is_optional: boolean;
  notes: string | null;
  exercises: {
    id: string;
    name: string;
    equipment: string | null;
    increment_kg: number;
    notes: string | null;
  };
};

type SetRow = {
  id: string;
  exercise_id: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  is_warmup: boolean;
  is_clean_solo: boolean;
};

const RPE_CHOICES = [7, 7.5, 8, 8.5, 9, 9.5, 10];

function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    setLeft(seconds);
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);
  useEffect(() => {
    if (left === 0) {
      navigator.vibrate?.([200, 100, 200]);
      onDone();
    }
  }, [left, onDone]);
  const m = Math.floor(Math.max(left, 0) / 60);
  const s = Math.max(left, 0) % 60;
  return (
    <button
      onClick={onDone}
      className={`tap fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full border border-ember bg-bg px-6 py-3 ${
        left <= 10 ? "pulse" : ""
      }`}
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <span className="display text-2xl font-bold text-ember">
        {m}:{String(s).padStart(2, "0")}
      </span>
      <span className="ml-2 text-xs text-mut">rest — tap to skip</span>
    </button>
  );
}

function SuggestionBadge({ s }: { s: Suggestion }) {
  if (s.kind === "fresh") return null;
  const style =
    s.kind === "increase"
      ? "bg-ok-soft text-ok"
      : s.kind === "stalled"
      ? "bg-ember-soft text-warn"
      : "bg-raised text-mut";
  const text =
    s.kind === "increase"
      ? `➕ ${s.reason}`
      : s.kind === "stalled"
      ? `⚠ ${s.reason}`
      : `◎ ${s.reason}`;
  return <p className={`mt-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${style}`}>{text}</p>;
}

function ExerciseCard({
  te,
  sets,
  lastSets,
  suggestion,
  onLog,
  onDelete,
}: {
  te: TemplateExercise;
  sets: SetRow[];
  lastSets: SetRow[];
  suggestion: Suggestion;
  onLog: (v: { weight: number | null; reps: number; rpe: number; clean: boolean }) => void;
  onDelete: (id: string) => void;
}) {
  const ex = te.exercises;
  const prefillW =
    suggestion.kind === "increase"
      ? suggestion.newWeight
      : suggestion.kind === "repeat"
      ? suggestion.weight
      : te.start_weight_kg;
  const [weight, setWeight] = useState<number | null>(prefillW ?? null);
  const [reps, setReps] = useState<number>(te.rep_min);
  const [rpe, setRpe] = useState<number>(te.target_rpe ?? 8);
  const [clean, setClean] = useState(true);
  const [open, setOpen] = useState(false);
  const done = sets.length >= te.target_sets;
  const inc = ex.increment_kg || 2.5;

  return (
    <div className={`card overflow-hidden ${done ? "opacity-70" : ""}`}>
      <button onClick={() => setOpen(!open)} className="tap flex w-full items-center justify-between p-4 text-left">
        <div className="min-w-0">
          <p className="display truncate text-lg font-bold">
            {ex.name}
            {te.is_optional && <span className="ml-2 text-xs font-medium text-faint">optional</span>}
          </p>
          <p className="text-xs text-mut">
            {te.target_sets} × {te.rep_min}–{te.rep_max} @ RPE {te.target_rpe ?? "—"} · rest{" "}
            {Math.round((te.rest_seconds ?? 90) / 60 * 10) / 10} min
          </p>
        </div>
        <span className={`display ml-3 text-xl font-bold ${done ? "text-ok" : "text-faint"}`}>
          {sets.length}/{te.target_sets}
        </span>
      </button>

      {open && (
        <div className="border-t border-line p-4 pt-3">
          {lastSets.length > 0 && (
            <p className="text-xs text-mut">
              Last time:{" "}
              {lastSets
                .map((s) => `${s.weight_kg ?? "bw"}×${s.reps}${s.rpe ? `@${s.rpe}` : ""}`)
                .join("  ·  ")}
            </p>
          )}
          <SuggestionBadge s={suggestion} />
          {(te.notes || ex.notes) && <p className="mt-1.5 text-xs text-faint">{te.notes ?? ex.notes}</p>}

          {/* Logged sets */}
          {sets.length > 0 && (
            <div className="mt-3 space-y-1">
              {sets.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg bg-raised px-3 py-1.5 text-sm">
                  <span>
                    <span className="text-faint">#{s.set_number}</span>{" "}
                    <span className="display font-semibold">
                      {s.weight_kg ?? "bw"} kg × {s.reps}
                    </span>{" "}
                    <span className="text-mut">@ {s.rpe}</span>
                    {!s.is_clean_solo && <span className="ml-1.5 text-xs text-warn">assisted</span>}
                  </span>
                  <button onClick={() => onDelete(s.id)} className="tap px-1 text-faint">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Entry row */}
          <div className="mt-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center rounded-xl bg-raised">
                <button onClick={() => setWeight((w) => Math.max((w ?? 0) - inc, 0))} className="tap px-3 text-lg text-mut">
                  −
                </button>
                <div className="flex-1 text-center">
                  <input
                    type="number"
                    step="0.5"
                    inputMode="decimal"
                    value={weight ?? ""}
                    placeholder="bw"
                    onChange={(e) => setWeight(e.target.value === "" ? null : parseFloat(e.target.value))}
                    className="display w-full bg-transparent py-2.5 text-center text-lg font-bold outline-none"
                  />
                  <p className="-mt-1 pb-1 text-[9px] text-faint">KG</p>
                </div>
                <button onClick={() => setWeight((w) => (w ?? 0) + inc)} className="tap px-3 text-lg text-mut">
                  +
                </button>
              </div>
              <div className="flex flex-1 items-center rounded-xl bg-raised">
                <button onClick={() => setReps((r) => Math.max(r - 1, 0))} className="tap px-3 text-lg text-mut">
                  −
                </button>
                <div className="flex-1 text-center">
                  <p className="display py-2.5 text-lg font-bold">{reps}</p>
                  <p className="-mt-1 pb-1 text-[9px] text-faint">REPS</p>
                </div>
                <button onClick={() => setReps((r) => r + 1)} className="tap px-3 text-lg text-mut">
                  +
                </button>
              </div>
            </div>

            <div className="flex gap-1">
              {RPE_CHOICES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRpe(r)}
                  className={`tap flex-1 rounded-lg py-2 text-xs font-semibold ${
                    rpe === r ? "bg-ember text-bg" : "bg-raised text-mut"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onLog({ weight, reps, rpe, clean });
                  navigator.vibrate?.(30);
                }}
                disabled={reps <= 0}
                className="tap display flex-1 rounded-xl bg-ember py-3 text-base font-bold uppercase text-bg disabled:opacity-50"
              >
                Log set {sets.length + 1}
              </button>
              <button
                onClick={() => setClean(!clean)}
                className={`tap rounded-xl px-3 py-3 text-xs font-semibold ${
                  clean ? "bg-raised text-faint" : "bg-ember-soft text-warn"
                }`}
                title="Assisted / forced reps don't count for progression"
              >
                {clean ? "solo ✓" : "assisted"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [resting, setResting] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const startRef = useRef<string | null>(null);

  const { data: session } = useQuery({
    queryKey: ["session", id],
    queryFn: async () => {
      const { data } = await supabase()
        .from("workout_sessions")
        .select("id, template_id, log_date, started_at, ended_at, notes")
        .eq("id", id)
        .single();
      startRef.current = data?.started_at ?? null;
      return data;
    },
  });

  const { data: exercises } = useQuery({
    queryKey: ["templateExercises", session?.template_id],
    enabled: !!session?.template_id,
    queryFn: async () => {
      const { data } = await supabase()
        .from("template_exercises")
        .select(
          "id, sort_order, target_sets, rep_min, rep_max, target_rpe, rest_seconds, start_weight_kg, is_optional, notes, exercises(id, name, equipment, increment_kg, notes)"
        )
        .eq("template_id", session!.template_id!)
        .order("sort_order");
      return (data ?? []) as unknown as TemplateExercise[];
    },
  });

  const { data: sets } = useQuery({
    queryKey: ["sets", id],
    queryFn: async () => {
      const { data } = await supabase()
        .from("set_logs")
        .select("id, exercise_id, set_number, weight_kg, reps, rpe, is_warmup, is_clean_solo")
        .eq("session_id", id)
        .order("set_number");
      return (data ?? []) as SetRow[];
    },
  });

  // Last-session sets + 3-session progression history per exercise
  const exIds = useMemo(() => exercises?.map((e) => e.exercises.id) ?? [], [exercises]);
  const { data: lastData } = useQuery({
    queryKey: ["lastSets", id, exIds.join(",")],
    enabled: exIds.length > 0,
    queryFn: async () => {
      const { data: prog } = await supabase()
        .from("v_exercise_progression")
        .select("exercise_id, log_date, top_weight_kg, top_reps")
        .in("exercise_id", exIds)
        .lt("log_date", todayIST())
        .order("log_date", { ascending: false });

      // last session date + recent tops per exercise (most recent first)
      const lastDate: Record<string, string> = {};
      const topW: Record<string, number[]> = {};
      const topR: Record<string, number[]> = {};
      for (const row of prog ?? []) {
        if (!lastDate[row.exercise_id]) lastDate[row.exercise_id] = row.log_date;
        (topW[row.exercise_id] ??= []).push(Number(row.top_weight_kg));
        (topR[row.exercise_id] ??= []).push(Number(row.top_reps));
      }

      const results: Record<string, SetRow[]> = {};
      await Promise.all(
        Object.entries(lastDate).map(async ([exId, d]) => {
          const { data } = await supabase()
            .from("set_logs")
            .select(
              "id, exercise_id, set_number, weight_kg, reps, rpe, is_warmup, is_clean_solo, workout_sessions!inner(log_date, deleted_at)"
            )
            .eq("exercise_id", exId)
            .eq("workout_sessions.log_date", d)
            .is("workout_sessions.deleted_at", null)
            .order("set_number");
          results[exId] = (data ?? []) as unknown as SetRow[];
        })
      );
      return { lastSets: results, topWeights: topW, topReps: topR };
    },
  });

  const logSet = useMutation({
    mutationFn: async ({
      exerciseId,
      setNumber,
      weight,
      reps,
      rpe,
      clean,
    }: {
      exerciseId: string;
      setNumber: number;
      weight: number | null;
      reps: number;
      rpe: number;
      clean: boolean;
    }) => {
      const { error } = await supabase().from("set_logs").insert({
        session_id: id,
        exercise_id: exerciseId,
        set_number: setNumber,
        weight_kg: weight,
        reps,
        rpe,
        is_clean_solo: clean,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sets", id] }),
  });

  const deleteSet = useMutation({
    mutationFn: async (setId: string) => {
      const { error } = await supabase().from("set_logs").delete().eq("id", setId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sets", id] }),
  });

  const finish = useMutation({
    mutationFn: async () => {
      const { error } = await supabase()
        .from("workout_sessions")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setFinished(true);
      qc.invalidateQueries({ queryKey: ["sessionToday"] });
    },
  });

  if (!session || !exercises) {
    return <p className="py-20 text-center text-faint">Loading session…</p>;
  }

  const working = (sets ?? []).filter((s) => !s.is_warmup);
  const volume = working.reduce((a, s) => a + (s.weight_kg ?? 0) * (s.reps ?? 0), 0);
  const durationMin = session.started_at
    ? Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000)
    : 0;

  if (finished || session.ended_at) {
    return (
      <div className="flex min-h-[70vh] flex-col justify-center gap-5 text-center">
        <p className="display text-6xl">🏁</p>
        <h1 className="display text-4xl font-bold uppercase">Session logged</h1>
        <div className="card mx-auto flex w-full max-w-xs justify-between p-5">
          <div>
            <p className="display text-3xl font-bold">{working.length}</p>
            <p className="label">Sets</p>
          </div>
          <div>
            <p className="display text-3xl font-bold">{Math.round(volume).toLocaleString()}</p>
            <p className="label">Volume kg</p>
          </div>
          <div>
            <p className="display text-3xl font-bold">{session.ended_at && session.started_at ? Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000) : durationMin}</p>
            <p className="label">Minutes</p>
          </div>
        </div>
        <button
          onClick={() => router.push("/")}
          className="tap display mx-auto w-full max-w-xs rounded-2xl bg-ember py-4 text-lg font-bold uppercase text-bg"
        >
          Done → cardio walk
        </button>
        <p className="text-xs text-faint">12–15 min incline walk, 10–12%, 5–5.5 km/h</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <header className="flex items-end justify-between">
        <div>
          <p className="label text-ember">{session.log_date}</p>
          <h1 className="display text-3xl font-bold uppercase leading-none">Session</h1>
        </div>
        <p className="text-right text-xs text-mut">
          {working.length} sets · {Math.round(volume).toLocaleString()} kg
          <br />
          {durationMin} min
        </p>
      </header>

      {exercises.map((te) => {
        const exSets = (sets ?? []).filter((s) => s.exercise_id === te.exercises.id && !s.is_warmup);
        const last = lastData?.lastSets[te.exercises.id] ?? [];
        const tops = lastData?.topWeights[te.exercises.id] ?? [];
        const reps3 = lastData?.topReps[te.exercises.id] ?? [];
        const suggestion = suggestNext(last, te.rep_max, te.exercises.increment_kg, tops.slice(0, 3), reps3.slice(0, 3));
        return (
          <ExerciseCard
            key={te.id}
            te={te}
            sets={exSets}
            lastSets={last.filter((s) => !s.is_warmup)}
            suggestion={suggestion}
            onDelete={(sid) => deleteSet.mutate(sid)}
            onLog={({ weight, reps, rpe, clean }) => {
              logSet.mutate({
                exerciseId: te.exercises.id,
                setNumber: exSets.length + 1,
                weight,
                reps,
                rpe,
                clean,
              });
              if (exSets.length + 1 < te.target_sets) setResting(te.rest_seconds ?? 90);
            }}
          />
        );
      })}

      <button
        onClick={() => finish.mutate()}
        className="tap display w-full rounded-2xl border border-ember py-4 text-lg font-bold uppercase text-ember"
      >
        Finish session
      </button>

      {resting !== null && <RestTimer seconds={resting} onDone={() => setResting(null)} />}
    </div>
  );
}
