"use client";
// EAT — day view by meal slot. Saved meals log in one tap; foods by count
// (roti / katori / scoop). Live totals, 30 g PB guard, weekly treat tracker.
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { todayIST, hourIST, shiftDate, weekStart, MEAL_SLOTS, SLOT_LABEL, type MealSlot, PB_CAP_G } from "@/lib/plan";
import { usePlan } from "@/lib/data";
import PhotoMacroLog from "@/components/PhotoMacroLog";

type Food = {
  id: string;
  name: string;
  serving_unit: string;
  serving_size: number;
  kcal: number;
  protein_g: number;
  carbs_g: number | null;
  fat_g: number | null;
  fibre_g: number | null;
  tags: string[] | null;
  is_favourite: boolean;
};

type MealLog = {
  id: string;
  meal_slot: MealSlot;
  is_treat: boolean;
  meal_items: {
    id: string;
    quantity: number;
    kcal: number | null;
    protein_g: number | null;
    foods: { name: string; serving_unit: string } | null;
  }[];
};

export default function Nutrition() {
  // 00:00–04:00 IST: default to logging yesterday (the day often ends after midnight)
  const lateNight = hourIST() < 4;
  const [useYesterday, setUseYesterday] = useState(lateNight);
  const date = useYesterday ? shiftDate(todayIST(), -1) : todayIST();
  const { plan } = usePlan();
  const qc = useQueryClient();
  const [pickerSlot, setPickerSlot] = useState<MealSlot | null>(null);
  const [search, setSearch] = useState("");

  const { data: foods } = useQuery({
    queryKey: ["foods"],
    queryFn: async () => {
      const { data } = await supabase().from("foods").select("*").order("name");
      return (data ?? []) as Food[];
    },
    staleTime: Infinity,
  });

  const { data: savedMeals } = useQuery({
    queryKey: ["savedMeals"],
    queryFn: async () => {
      const { data } = await supabase()
        .from("saved_meals")
        .select("id, name, meal_slot, saved_meal_items(food_id, quantity)");
      return data ?? [];
    },
    staleTime: Infinity,
  });

  const { data: meals } = useQuery({
    queryKey: ["meals", date],
    queryFn: async () => {
      const { data } = await supabase()
        .from("meal_logs")
        .select("id, meal_slot, is_treat, meal_items(id, quantity, kcal, protein_g, carbs_g, fat_g, fibre_g, foods(name, serving_unit))")
        .eq("log_date", date)
        .is("deleted_at", null)
        .order("logged_at");
      return (data ?? []) as unknown as MealLog[];
    },
  });

  // Treats already used this ISO week
  const { data: weekTreats } = useQuery({
    queryKey: ["treats", weekStart(date)],
    queryFn: async () => {
      const { count } = await supabase()
        .from("meal_logs")
        .select("id", { count: "exact", head: true })
        .eq("is_treat", true)
        .is("deleted_at", null)
        .gte("log_date", weekStart(date))
        .lte("log_date", shiftDate(weekStart(date), 6));
      return count ?? 0;
    },
  });

  const totals = useMemo(() => {
    let kcal = 0,
      protein = 0,
      pbGrams = 0;
    for (const m of meals ?? [])
      for (const i of m.meal_items) {
        kcal += Number(i.kcal ?? 0);
        protein += Number(i.protein_g ?? 0);
      }
    const carbs = (meals ?? []).flatMap((m) => m.meal_items).reduce((a, i) => a + Number((i as { carbs_g?: number }).carbs_g ?? 0), 0);
    const fat = (meals ?? []).flatMap((m) => m.meal_items).reduce((a, i) => a + Number((i as { fat_g?: number }).fat_g ?? 0), 0);
    const fibre = (meals ?? []).flatMap((m) => m.meal_items).reduce((a, i) => a + Number((i as { fibre_g?: number }).fibre_g ?? 0), 0);
    // PB guard: sum quantity × serving_size of pb_capped foods
    const pbFood = foods?.find((f) => f.tags?.includes("pb_capped"));
    if (pbFood) {
      for (const m of meals ?? [])
        for (const i of m.meal_items)
          if (i.foods?.name === pbFood.name) pbGrams += Number(i.quantity) * Number(pbFood.serving_size);
    }
    return { kcal, protein, carbs, fat, fibre, pbGrams };
  }, [meals, foods]);

  const logFoods = useMutation({
    mutationFn: async ({
      slot,
      items,
      isTreat,
    }: {
      slot: MealSlot;
      items: { food: Food; quantity: number }[];
      isTreat?: boolean;
    }) => {
      const { data: u } = await supabase().auth.getUser();
      const { data: meal, error } = await supabase()
        .from("meal_logs")
        .insert({ user_id: u.user!.id, log_date: date, meal_slot: slot, is_treat: isTreat ?? slot === "treat" })
        .select("id")
        .single();
      if (error) throw error;
      const { error: e2 } = await supabase().from("meal_items").insert(
        items.map(({ food, quantity }) => ({
          meal_log_id: meal.id,
          food_id: food.id,
          quantity,
          // snapshot macros at log time
          kcal: Number(food.kcal) * quantity,
          protein_g: Number(food.protein_g) * quantity,
          carbs_g: food.carbs_g != null ? Number(food.carbs_g) * quantity : null,
          fat_g: food.fat_g != null ? Number(food.fat_g) * quantity : null,
          fibre_g: food.fibre_g != null ? Number(food.fibre_g) * quantity : null,
        }))
      );
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meals", date] });
      qc.invalidateQueries({ queryKey: ["nutrition", date] });
      qc.invalidateQueries({ queryKey: ["treats"] });
      setPickerSlot(null);
      setSearch("");
    },
  });

  const deleteMeal = useMutation({
    mutationFn: async (mealId: string) => {
      const { error } = await supabase()
        .from("meal_logs")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", mealId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meals", date] });
      qc.invalidateQueries({ queryKey: ["nutrition", date] });
    },
  });

  function logSavedMeal(sm: { name: string; meal_slot: string | null; saved_meal_items: { food_id: string; quantity: number }[] }) {
    const items = sm.saved_meal_items
      .map((i) => ({ food: foods?.find((f) => f.id === i.food_id), quantity: Number(i.quantity) }))
      .filter((x): x is { food: Food; quantity: number } => !!x.food);
    if (items.length) logFoods.mutate({ slot: (sm.meal_slot ?? "snack") as MealSlot, items });
  }

  const kcalLeft = plan.kcal_target - totals.kcal;
  const proteinLeft = plan.protein_g_target - totals.protein;
  const filteredFoods = (foods ?? []).filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <header className="rise rise-1 flex items-end justify-between">
        <div>
          <p className="label text-ember">Eat · {date}</p>
          <h1 className="display text-4xl font-bold uppercase leading-none">Fuel log</h1>
        </div>
        {lateNight && (
          <button
            onClick={() => setUseYesterday(!useYesterday)}
            className="tap rounded-full border border-line px-3 py-1.5 text-xs text-mut"
          >
            {useYesterday ? "→ today" : "→ yesterday"}
          </button>
        )}
      </header>

      {/* Remaining */}
      <section className="card rise rise-2 flex divide-x divide-line">
        <div className="flex-1 p-4">
          <p className="label">kcal left</p>
          <p className={`display text-3xl font-bold ${kcalLeft < 0 ? "text-bad" : ""}`}>
            {Math.round(kcalLeft)}
          </p>
          <p className="text-[10px] text-faint">
            {Math.round(totals.kcal)} / {plan.kcal_target}
          </p>
        </div>
        <div className="flex-1 p-4">
          <p className="label">protein left</p>
          <p className={`display text-3xl font-bold ${proteinLeft <= 0 ? "text-ok" : ""}`}>
            {Math.max(Math.round(proteinLeft), 0)}
            <span className="text-base text-faint">g</span>
          </p>
          <p className="text-[10px] text-faint">
            {Math.round(totals.protein)} / {plan.protein_g_target}g
          </p>
        </div>
        <div className="flex-1 p-4">
          <p className="label">treat</p>
          <p className={`display text-3xl font-bold ${(weekTreats ?? 0) > 1 ? "text-warn" : ""}`}>
            {weekTreats ?? 0}/1
          </p>
          <p className="text-[10px] text-faint">this week</p>
        </div>
      </section>

      {/* Secondary macros vs plan targets */}
      <div className="rise rise-2 -mt-2 flex justify-between px-1 text-xs text-mut">
        <span>
          Carbs <span className="text-ink">{Math.round(totals.carbs)}</span>/{plan.carbs_g_target ?? 185}g
        </span>
        <span>
          Fat <span className="text-ink">{Math.round(totals.fat)}</span>/{plan.fat_g_target ?? 55}g
        </span>
        <span>
          Fibre{" "}
          <span className={totals.fibre >= (plan.fibre_g_target ?? 30) ? "text-ok" : "text-ink"}>
            {Math.round(totals.fibre)}
          </span>
          /{plan.fibre_g_target ?? 30}g
        </span>
      </div>

      {totals.pbGrams > PB_CAP_G && (
        <div className="rise rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          ⚠ Peanut butter today: {Math.round(totals.pbGrams)} g — cap is {PB_CAP_G} g. This is the plan&apos;s
          #1 calorie lever.
        </div>
      )}
      {(weekTreats ?? 0) > 1 && (
        <div className="rise rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          ⚠ Second treat this week — the plan budgets one.
        </div>
      )}

      {/* Photo logging */}
      <section className="rise rise-3">
        <PhotoMacroLog date={date} onLogged={() => {}} />
      </section>

      {/* Saved meals — one-tap logging */}
      <section className="rise rise-3">
        <p className="label mb-2">One-tap meals</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {savedMeals?.map((sm) => (
            <button
              key={sm.id}
              onClick={() => logSavedMeal(sm)}
              disabled={logFoods.isPending}
              className="tap card shrink-0 px-4 py-3 text-left"
            >
              <p className="text-sm font-semibold">{sm.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-faint">
                {SLOT_LABEL[(sm.meal_slot ?? "snack") as MealSlot]}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Slots */}
      <section className="rise rise-4 space-y-2.5">
        {MEAL_SLOTS.map((slot) => {
          const slotMeals = (meals ?? []).filter((m) => m.meal_slot === slot);
          return (
            <div key={slot} className="card p-3.5">
              <div className="flex items-center justify-between">
                <p className="label">{SLOT_LABEL[slot]}</p>
                <button
                  onClick={() => setPickerSlot(pickerSlot === slot ? null : slot)}
                  className="tap rounded-full bg-raised px-3 py-1 text-sm font-bold text-ember"
                >
                  +
                </button>
              </div>
              {slotMeals.map((m) => (
                <div key={m.id} className="mt-2 flex items-start justify-between gap-2 rounded-lg bg-raised px-3 py-2">
                  <div className="text-sm">
                    {m.meal_items.map((i) => (
                      <p key={i.id}>
                        <span className="text-mut">{Number(i.quantity)}×</span> {i.foods?.name}{" "}
                        <span className="text-faint">
                          · {Math.round(Number(i.kcal ?? 0))} kcal / {Math.round(Number(i.protein_g ?? 0))}g P
                        </span>
                      </p>
                    ))}
                    {m.is_treat && <span className="text-xs text-warn">treat</span>}
                  </div>
                  <button onClick={() => deleteMeal.mutate(m.id)} className="tap px-1 text-faint">
                    ✕
                  </button>
                </div>
              ))}

              {/* Food picker */}
              {pickerSlot === slot && (
                <div className="mt-3 border-t border-line pt-3">
                  <input
                    autoFocus
                    placeholder="Search foods…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl bg-raised px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ember"
                  />
                  <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                    {filteredFoods.map((f) => (
                      <FoodRow
                        key={f.id}
                        food={f}
                        onLog={(qty) => logFoods.mutate({ slot, items: [{ food: f, quantity: qty }] })}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

function FoodRow({ food, onLog }: { food: Food; onLog: (qty: number) => void }) {
  const [qty, setQty] = useState(1);
  const step = food.serving_unit === "g" || food.serving_unit === "ml" ? 0.25 : 0.5;
  const unitLabel =
    food.serving_unit === "g" || food.serving_unit === "ml"
      ? `${Math.round(food.serving_size * qty)} ${food.serving_unit}`
      : `${qty} ${food.serving_unit}`;
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg px-1 py-1.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{food.name}</p>
        <p className="text-[10px] text-faint">
          {Math.round(Number(food.kcal) * qty)} kcal · {Math.round(Number(food.protein_g) * qty)}g P ·{" "}
          {unitLabel}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => setQty((q) => Math.max(q - step, step))} className="tap rounded-lg bg-raised px-2.5 py-1.5 text-mut">
          −
        </button>
        <span className="display w-9 text-center text-sm font-bold">{qty}</span>
        <button onClick={() => setQty((q) => q + step)} className="tap rounded-lg bg-raised px-2.5 py-1.5 text-mut">
          +
        </button>
        <button onClick={() => onLog(qty)} className="tap ml-1 rounded-lg bg-ember-soft px-3 py-1.5 text-sm font-bold text-ember">
          Log
        </button>
      </div>
    </div>
  );
}
