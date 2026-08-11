"use client";
// TRAIN — pick a session to PREVIEW (nothing starts until you press
// "Start session" on the next screen).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { todayIST, isoDow } from "@/lib/plan";

const DOW = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WorkoutStart() {
  const router = useRouter();
  const dow = isoDow(todayIST());

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
        .select("id, log_date, ended_at, workout_templates(name)")
        .is("deleted_at", null)
        .order("log_date", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  // Always weekday order — today is highlighted in place, never moved
  const ordered = [...(templates ?? [])].sort(
    (a, b) => (a.day_of_week ?? 9) - (b.day_of_week ?? 9)
  );

  return (
    <div className="space-y-5">
      <header className="rise rise-1">
        <p className="label text-ember">Train</p>
        <h1 className="display text-4xl font-bold uppercase leading-none">Pick your session</h1>
        <p className="mt-1 text-sm text-mut">Tap to preview — nothing starts yet.</p>
      </header>

      <div className="rise rise-2 space-y-2.5">
        {ordered.map((t) => {
          const isToday = t.day_of_week === dow;
          return (
            <Link
              key={t.id}
              href={`/workout/${t.id}`}
              className={`tap card flex w-full items-center justify-between p-4 text-left ${
                isToday ? "border-ember bg-ember-soft" : ""
              }`}
            >
              <div>
                <p className={`display text-xl font-bold uppercase ${isToday ? "text-ember" : ""}`}>
                  {t.name}
                </p>
                <p className="text-sm text-mut">{t.focus}</p>
              </div>
              <span className="flex items-center gap-2">
                <span className="label">{isToday ? "Today" : DOW[t.day_of_week ?? 0]}</span>
                <span className="text-faint">›</span>
              </span>
            </Link>
          );
        })}
        {templates?.length === 0 && (
          <p className="card p-4 text-sm text-faint">No templates — run supabase/seed.sql after logging in.</p>
        )}
      </div>

      <Link href="/workout/history" className="tap card rise rise-3 flex items-center justify-between p-4">
        <div>
          <p className="label">Exercise history</p>
          <p className="text-sm text-mut">Top-set weight over time, per exercise</p>
        </div>
        <span className="text-xl">📈</span>
      </Link>

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
