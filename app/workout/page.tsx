"use client";
// TRAIN — template picker (today's day first) + recent session history.
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { todayIST, isoDow } from "@/lib/plan";

const DOW = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WorkoutStart() {
  const router = useRouter();
  const date = todayIST();
  const dow = isoDow(date);

  const { data: templates } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const { data } = await supabase()
        .from("workout_templates")
        .select("id, name, focus, day_of_week")
        .eq("is_active", true)
        .order("sort_order");
      return data ?? [];
    },
  });

  const { data: history } = useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const { data } = await supabase()
        .from("workout_sessions")
        .select("id, log_date, ended_at, started_at, workout_templates(name)")
        .is("deleted_at", null)
        .order("log_date", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const start = useMutation({
    mutationFn: async (templateId: string) => {
      const { data: u } = await supabase().auth.getUser();
      // Resume an unfinished session for this template today instead of duplicating
      const { data: open } = await supabase()
        .from("workout_sessions")
        .select("id")
        .eq("log_date", date)
        .eq("template_id", templateId)
        .is("ended_at", null)
        .is("deleted_at", null)
        .maybeSingle();
      if (open) return open.id;
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

  const ordered = [...(templates ?? [])].sort((a, b) => {
    const at = a.day_of_week === dow ? -1 : 0;
    const bt = b.day_of_week === dow ? -1 : 0;
    return at - bt || (a.day_of_week ?? 9) - (b.day_of_week ?? 9);
  });

  return (
    <div className="space-y-5">
      <header className="rise rise-1">
        <p className="label text-ember">Train</p>
        <h1 className="display text-4xl font-bold uppercase leading-none">Pick your session</h1>
      </header>

      <div className="rise rise-2 space-y-2.5">
        {ordered.map((t) => {
          const isToday = t.day_of_week === dow;
          return (
            <button
              key={t.id}
              disabled={start.isPending}
              onClick={() => start.mutate(t.id)}
              className={`tap card flex w-full items-center justify-between p-4 text-left transition-colors ${
                isToday ? "border-ember bg-ember-soft" : ""
              }`}
            >
              <div>
                <p className={`display text-xl font-bold uppercase ${isToday ? "text-ember" : ""}`}>
                  {t.name}
                </p>
                <p className="text-sm text-mut">{t.focus}</p>
              </div>
              <span className="label">{isToday ? "Today" : DOW[t.day_of_week ?? 0]}</span>
            </button>
          );
        })}
        {templates?.length === 0 && (
          <p className="card p-4 text-sm text-faint">No templates — run supabase/seed.sql after logging in.</p>
        )}
      </div>

      {history && history.length > 0 && (
        <section className="rise rise-3">
          <p className="label mb-2">Recent sessions</p>
          <div className="space-y-1.5">
            {history.map((s) => (
              <button
                key={s.id}
                onClick={() => router.push(`/workout/session/${s.id}`)}
                className="tap card flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm">
                  {(s.workout_templates as unknown as { name: string } | null)?.name ?? "Session"}
                </span>
                <span className="text-xs text-faint">
                  {s.log_date}
                  {!s.ended_at && <span className="ml-2 text-ember">open</span>}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
