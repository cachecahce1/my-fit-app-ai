"use client";
// SETTINGS — plan targets (versioned, never edited in place), step target,
// sign out. Guardrails live here too: 1,500 kcal is a hard block.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { todayIST, KCAL_HARD_FLOOR } from "@/lib/plan";

const FIELDS = [
  { key: "kcal_target", label: "Calories / day", unit: "kcal" },
  { key: "protein_g_target", label: "Protein", unit: "g" },
  { key: "carbs_g_target", label: "Carbs", unit: "g" },
  { key: "fat_g_target", label: "Fat", unit: "g" },
  { key: "fibre_g_target", label: "Fibre", unit: "g" },
  { key: "water_ml_target", label: "Water", unit: "ml" },
  { key: "sleep_hours_target", label: "Sleep", unit: "h" },
  { key: "sessions_per_week", label: "Sessions / week", unit: "" },
] as const;
type FieldKey = (typeof FIELDS)[number]["key"];

function bumpVersion(v: string | null): string {
  const m = v?.match(/^v(\d+)\.(\d+)$/);
  return m ? `v${m[1]}.${Number(m[2]) + 1}` : `v-${todayIST()}`;
}

export default function Settings() {
  const router = useRouter();
  const qc = useQueryClient();
  const date = todayIST();
  const [draft, setDraft] = useState<Partial<Record<FieldKey, string>>>({});
  const [stepDraft, setStepDraft] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const { data: plan } = useQuery({
    queryKey: ["planFull"],
    queryFn: async () => {
      const { data } = await supabase()
        .from("plan_versions")
        .select("*")
        .is("effective_to", null)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: stepTarget } = useQuery({
    queryKey: ["stepTargetNow"],
    queryFn: async () => {
      const { data } = await supabase()
        .from("step_targets")
        .select("daily_steps, effective_from")
        .lte("effective_from", date)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Prefill once the plan loads
  useEffect(() => {
    if (plan && Object.keys(draft).length === 0) {
      const d: Partial<Record<FieldKey, string>> = {};
      for (const f of FIELDS) d[f.key] = String(plan[f.key] ?? "");
      setDraft(d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  const dirty =
    plan && FIELDS.some((f) => draft[f.key] !== undefined && draft[f.key] !== String(plan[f.key] ?? ""));

  const savePlan = useMutation({
    mutationFn: async () => {
      const kcal = parseInt(draft.kcal_target ?? "0");
      const protein = parseInt(draft.protein_g_target ?? "0");
      if (kcal < KCAL_HARD_FLOOR) {
        throw new Error(
          `Blocked: ${kcal} kcal is below the plan's hard floor of ${KCAL_HARD_FLOOR}. The stall floor is 1,800 — crash dieting costs muscle and ends in a rabdi-sized rebound.`
        );
      }
      if (kcal < 1800) {
        if (!confirm(`${kcal} kcal is below the 1,800 stall floor. The plan only goes here after the full stall ladder. Continue?`)) return;
      }
      if (plan && protein < Number(plan.protein_g_target)) {
        if (!confirm(`Lowering protein ${plan.protein_g_target} → ${protein} g. The plan's rule: protein is never the macro that gets cut. Continue anyway?`)) return;
      }
      const { data: u } = await supabase().auth.getUser();
      // close the current version, insert the new one — history stays intact
      const { error: e1 } = await supabase()
        .from("plan_versions")
        .update({ effective_to: date })
        .eq("id", plan!.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase().from("plan_versions").insert({
        user_id: u.user!.id,
        version: bumpVersion(plan!.version),
        effective_from: date,
        kcal_target: kcal,
        kcal_min: kcal - 50,
        kcal_max: kcal + 50,
        protein_g_target: protein,
        protein_g_max: protein + 10,
        carbs_g_target: parseInt(draft.carbs_g_target ?? "0") || null,
        fat_g_target: parseInt(draft.fat_g_target ?? "0") || null,
        fibre_g_target: parseInt(draft.fibre_g_target ?? "0") || null,
        water_ml_target: parseInt(draft.water_ml_target ?? "0") || null,
        sleep_hours_target: parseFloat(draft.sleep_hours_target ?? "0") || null,
        sessions_per_week: parseInt(draft.sessions_per_week ?? "0") || null,
        notes: `Adjusted from ${plan!.version} on ${date}`,
      });
      if (e2) throw e2;
      setSaved(true);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planFull"] });
      qc.invalidateQueries({ queryKey: ["plan"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Save failed"),
  });

  const saveSteps = useMutation({
    mutationFn: async () => {
      const steps = parseInt(stepDraft);
      if (!steps || steps < 1000) throw new Error("Enter a sensible daily step target");
      const { data: u } = await supabase().auth.getUser();
      const { error } = await supabase()
        .from("step_targets")
        .insert({ user_id: u.user!.id, effective_from: date, daily_steps: steps });
      if (error) throw error;
      setStepDraft("");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stepTargetNow"] });
      qc.invalidateQueries({ queryKey: ["stepTarget"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Save failed"),
  });

  async function signOut() {
    await supabase().auth.signOut();
    router.push("/login");
  }

  return (
    <div className="space-y-4">
      <header className="rise rise-1">
        <button onClick={() => router.push("/")} className="tap mb-1 text-sm text-mut">
          ← Today
        </button>
        <h1 className="display text-4xl font-bold uppercase leading-none">Settings</h1>
        {plan && (
          <p className="mt-1 text-sm text-mut">
            Plan {plan.version} · active since {plan.effective_from}
          </p>
        )}
      </header>

      {/* Plan targets */}
      <section className="card rise rise-2 p-4">
        <p className="label mb-3">Plan targets</p>
        <div className="space-y-2.5">
          {FIELDS.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-3">
              <p className="text-sm text-mut">{f.label}</p>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  inputMode="decimal"
                  value={draft[f.key] ?? ""}
                  onChange={(e) => {
                    setDraft((d) => ({ ...d, [f.key]: e.target.value }));
                    setError("");
                    setSaved(false);
                  }}
                  className="display w-24 rounded-lg bg-raised px-2.5 py-2 text-right font-bold outline-none focus:ring-1 focus:ring-ember"
                />
                <span className="w-8 text-xs text-faint">{f.unit}</span>
              </div>
            </div>
          ))}
        </div>
        {error && <p className="mt-3 rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}
        {saved && <p className="mt-3 text-sm text-ok">✓ Saved as {plan?.version} — history preserved</p>}
        <button
          onClick={() => savePlan.mutate()}
          disabled={!dirty || savePlan.isPending}
          className="tap display mt-4 w-full rounded-xl bg-ember py-3 font-bold uppercase text-bg disabled:opacity-40"
        >
          Save as new plan version
        </button>
        <p className="mt-2 text-[11px] text-faint">
          Changes never rewrite history — the current version is closed and a new one starts today,
          so past weeks stay interpretable.
        </p>
      </section>

      {/* Step target */}
      <section className="card rise rise-3 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="label">Daily step target</p>
            <p className="display text-2xl font-bold">
              {stepTarget?.daily_steps?.toLocaleString() ?? "—"}
              <span className="ml-1 text-xs font-medium text-faint">
                since {stepTarget?.effective_from}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              inputMode="numeric"
              placeholder="new"
              value={stepDraft}
              onChange={(e) => setStepDraft(e.target.value)}
              className="w-20 rounded-lg bg-raised px-2.5 py-2 text-right text-sm outline-none focus:ring-1 focus:ring-warn"
            />
            <button
              onClick={() => saveSteps.mutate()}
              disabled={!stepDraft || saveSteps.isPending}
              className="tap rounded-lg bg-raised px-3 py-2 text-sm font-bold text-warn disabled:opacity-40"
            >
              Set
            </button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-faint">Plan ladder: 4k (wk 1–2) → 6k (wk 3–4) → 7.5k (wk 5+)</p>
      </section>

      {/* Account */}
      <section className="card rise rise-4 p-4">
        <p className="label mb-2">Account</p>
        <p className="mb-3 text-sm text-mut">Timezone: Asia/Kolkata (all log dates)</p>
        <button
          onClick={signOut}
          className="tap w-full rounded-xl border border-line py-3 text-sm font-semibold text-mut"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
