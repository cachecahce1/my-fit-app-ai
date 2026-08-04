"use client";
// Photo → macro estimate → editable review → logged as a meal.
// Estimates land as a user-owned food row tagged 'photo_logged', so the
// existing meal_logs/meal_items flow (and all totals/views) just work.
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { hourIST, MEAL_SLOTS, SLOT_LABEL, type MealSlot } from "@/lib/plan";

type Estimate = {
  description: string;
  items: { name: string; portion: string }[];
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
  confidence: "low" | "medium" | "high";
};

function guessSlot(): MealSlot {
  const h = hourIST();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 20) return "pre_workout";
  if (h < 22) return "post_workout";
  return "dinner";
}

/** Downscale to ≤1024px JPEG so the request stays small and cheap. */
async function toDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1024 / Math.max(bitmap.width, bitmap.height), 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function PhotoMacroLog({ date, onLogged }: { date: string; onLogged: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState("");
  const [est, setEst] = useState<Estimate | null>(null);
  const [slot, setSlot] = useState<MealSlot>(guessSlot());
  const qc = useQueryClient();

  async function pick(file: File) {
    setError("");
    setEst(null);
    setPreview(await toDataUrl(file));
  }

  async function estimate() {
    if (!preview && !note.trim()) return;
    setEstimating(true);
    setError("");
    try {
      const res = await fetch("/api/estimate-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: preview ?? undefined, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Estimate failed");
      setEst(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Estimate failed");
    } finally {
      setEstimating(false);
    }
  }

  const log = useMutation({
    mutationFn: async () => {
      if (!est) return;
      const { data: u } = await supabase().auth.getUser();
      const uid = u.user!.id;
      const { data: food, error: e1 } = await supabase()
        .from("foods")
        .insert({
          user_id: uid,
          name: `📷 ${est.description}`.slice(0, 80),
          serving_unit: "meal",
          serving_size: 1,
          kcal: est.kcal,
          protein_g: est.protein_g,
          carbs_g: est.carbs_g,
          fat_g: est.fat_g,
          fibre_g: est.fibre_g,
          tags: ["photo_logged"],
        })
        .select("id")
        .single();
      if (e1) throw e1;
      const { data: meal, error: e2 } = await supabase()
        .from("meal_logs")
        .insert({ user_id: uid, log_date: date, meal_slot: slot, is_treat: slot === "treat" })
        .select("id")
        .single();
      if (e2) throw e2;
      const { error: e3 } = await supabase().from("meal_items").insert({
        meal_log_id: meal.id,
        food_id: food.id,
        quantity: 1,
        kcal: est.kcal,
        protein_g: est.protein_g,
        carbs_g: est.carbs_g,
        fat_g: est.fat_g,
        fibre_g: est.fibre_g,
      });
      if (e3) throw e3;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meals", date] });
      qc.invalidateQueries({ queryKey: ["nutrition", date] });
      qc.invalidateQueries({ queryKey: ["foods"] });
      setPreview(null);
      setEst(null);
      setNote("");
      onLogged();
    },
  });

  function setMacro(key: keyof Estimate, v: string) {
    if (!est) return;
    setEst({ ...est, [key]: parseFloat(v) || 0 });
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="label">Log by photo</p>
        {est && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              est.confidence === "high" ? "bg-ok-soft text-ok" : est.confidence === "medium" ? "bg-raised text-mut" : "bg-ember-soft text-warn"
            }`}
          >
            {est.confidence} confidence
          </span>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])}
      />

      {!est && (
        <div className="mt-3 space-y-3">
          {preview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={preview} alt="meal" className="max-h-44 w-full rounded-xl object-cover" />
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="tap flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-raised py-5 text-sm text-mut"
            >
              📷 Snap or pick a meal photo
            </button>
          )}

          <input
            placeholder={preview ? "Optional note — '2 roti, high-protein paneer'" : "…or just type it — '2 roti + paneer bhurji + 1 katori dal'"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !estimating && estimate()}
            className="w-full rounded-xl bg-raised px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ember"
          />
          <div className="flex gap-2">
            {preview && (
              <button
                onClick={() => {
                  setPreview(null);
                  setError("");
                }}
                className="tap rounded-xl bg-raised px-4 py-3 text-sm text-mut"
              >
                ✕
              </button>
            )}
            <button
              onClick={estimate}
              disabled={estimating || (!preview && !note.trim())}
              className="tap display flex-1 rounded-xl bg-ember py-3 font-bold uppercase text-bg disabled:opacity-50"
            >
              {estimating ? (preview ? "Reading the plate…" : "Calculating…") : "Estimate macros"}
            </button>
          </div>
        </div>
      )}

      {est && (
        <div className="mt-3 space-y-3">
          {preview && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={preview} alt="meal" className="max-h-44 w-full rounded-xl object-cover" />
          )}
          <div>
            <p className="text-sm font-semibold">{est.description}</p>
                <p className="mt-0.5 text-xs text-faint">
                  {est.items.map((i) => `${i.name} (${i.portion})`).join(" · ")}
                </p>
              </div>

              {/* Editable macros — the estimate is a starting point, not truth */}
              <div className="grid grid-cols-5 gap-1.5">
                {(
                  [
                    ["kcal", "kcal"],
                    ["protein_g", "P g"],
                    ["carbs_g", "C g"],
                    ["fat_g", "F g"],
                    ["fibre_g", "Fb g"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={Math.round(Number(est[key]))}
                      onChange={(e) => setMacro(key, e.target.value)}
                      className="display w-full rounded-lg bg-raised py-2 text-center text-sm font-bold outline-none focus:ring-1 focus:ring-ember"
                    />
                    <p className="mt-0.5 text-center text-[9px] text-faint">{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-1 overflow-x-auto pb-0.5">
                {MEAL_SLOTS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSlot(s)}
                    className={`tap shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                      slot === s ? "bg-ember text-bg" : "bg-raised text-mut"
                    }`}
                  >
                    {SLOT_LABEL[s]}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setEst(null)}
                  className="tap rounded-xl bg-raised px-4 py-3 text-sm text-mut"
                >
                  ↺
                </button>
                <button
                  onClick={() => log.mutate()}
                  disabled={log.isPending}
                  className="tap display flex-1 rounded-xl bg-ember py-3 font-bold uppercase text-bg disabled:opacity-60"
                >
                  {log.isPending ? "Logging…" : `Log to ${SLOT_LABEL[slot]}`}
                </button>
              </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
