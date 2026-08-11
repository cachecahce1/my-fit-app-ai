"use client";
// WORKOUT PREVIEW — see the whole day before committing. Nothing starts
// until you press the button.
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { todayIST } from "@/lib/plan";

export default function WorkoutPreview() {
  const { templateId } = useParams<{ templateId: string }>();
  const router = useRouter();
  const date = todayIST();

  const { data: template } = useQuery({
    queryKey: ["templatePreview", templateId],
    queryFn: async () => {
      const { data } = await supabase()
        .from("workout_templates")
        .select(
          "id, name, focus, day_of_week, template_exercises(id, sort_order, target_sets, rep_min, rep_max, target_rpe, rest_seconds, start_weight_kg, is_optional, notes, exercises(name, equipment))"
        )
        .eq("id", templateId)
        .single();
      return data;
    },
  });

  // Unfinished session for this template today → resume instead of duplicating
  const { data: openSession } = useQuery({
    queryKey: ["openSession", templateId, date],
    queryFn: async () => {
      const { data } = await supabase()
        .from("workout_sessions")
        .select("id")
        .eq("template_id", templateId)
        .eq("log_date", date)
        .is("ended_at", null)
        .is("deleted_at", null)
        .maybeSingle();
      return data;
    },
  });

  const { data: lastDone } = useQuery({
    queryKey: ["lastDone", templateId],
    queryFn: async () => {
      const { data } = await supabase()
        .from("workout_sessions")
        .select("log_date")
        .eq("template_id", templateId)
        .not("ended_at", "is", null)
        .is("deleted_at", null)
        .order("log_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const start = useMutation({
    mutationFn: async () => {
      if (openSession) return openSession.id;
      const { data: u } = await supabase().auth.getUser();
      const { data, error } = await supabase()
        .from("workout_sessions")
        .insert({
          user_id: u.user!.id,
          template_id: templateId,
          log_date: date,
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => router.push(`/workout/session/${id}`),
  });

  if (!template) return <p className="py-20 text-center text-faint">Loading…</p>;

  const exercises = [...(template.template_exercises ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const totalSets = exercises.reduce((n, te) => n + (te.is_optional ? 0 : te.target_sets), 0);

  return (
    <div className="space-y-4 pb-24">
      <header className="rise rise-1">
        <button onClick={() => router.push("/workout")} className="tap mb-1 text-sm text-mut">
          ← All workouts
        </button>
        <h1 className="display text-4xl font-bold uppercase leading-none">{template.name}</h1>
        <p className="mt-1 text-sm text-mut">
          {template.focus} · {exercises.length} exercises · {totalSets} working sets
          {lastDone && <> · last done {lastDone.log_date}</>}
        </p>
      </header>

      <div className="rise rise-2 space-y-2">
        {exercises.map((te, i) => {
          const ex = te.exercises as unknown as { name: string; equipment: string | null };
          return (
            <div key={te.id} className="card flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  <span className="display mr-2 text-faint">{i + 1}</span>
                  {ex.name}
                  {te.is_optional && <span className="ml-2 text-xs text-faint">optional</span>}
                </p>
                <p className="text-xs text-mut">
                  {te.target_sets} × {te.rep_min}–{te.rep_max} @ RPE {te.target_rpe ?? "—"}
                  {te.start_weight_kg != null && (
                    <span className="text-ink"> · {Number(te.start_weight_kg)} kg</span>
                  )}
                </p>
              </div>
              <span className="label ml-3 shrink-0">{ex.equipment}</span>
            </div>
          );
        })}
      </div>

      {/* Pinned start button — explicit, no accidents */}
      <div
        className="fixed inset-x-0 bottom-16 z-30 mx-auto max-w-md px-4"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <button
          onClick={() => start.mutate()}
          disabled={start.isPending}
          className="tap display w-full rounded-2xl bg-ember py-4 text-xl font-bold uppercase tracking-wide text-bg shadow-lg shadow-ember/20 disabled:opacity-60"
        >
          {start.isPending ? "Starting…" : openSession ? "Resume session →" : "Start session"}
        </button>
      </div>
    </div>
  );
}
