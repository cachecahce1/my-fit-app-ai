// Plan constants + date helpers. All log_dates live in Asia/Kolkata.

export const IST = "Asia/Kolkata";

/** YYYY-MM-DD for "now" in IST. */
export function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(new Date());
}

/** Current hour (0-23) in IST — used for the "log to yesterday?" prompt. */
export function hourIST(): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: IST, hour: "2-digit", hour12: false }).format(new Date())
  );
}

export function shiftDate(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** ISO day of week 1=Mon..7=Sun for an IST date string. */
export function isoDow(isoDate: string): number {
  const gd = new Date(isoDate + "T12:00:00Z").getUTCDay();
  return gd === 0 ? 7 : gd;
}

/** Monday of the week containing the given IST date. */
export function weekStart(isoDate: string): string {
  return shiftDate(isoDate, 1 - isoDow(isoDate));
}

export const MEAL_SLOTS = [
  "breakfast",
  "lunch",
  "pre_workout",
  "post_workout",
  "dinner",
  "snack",
  "treat",
] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  pre_workout: "Pre-workout",
  post_workout: "Post-workout",
  dinner: "Dinner",
  snack: "Snack",
  treat: "Treat",
};

// Fallbacks if plan_versions hasn't loaded (values = plan v1.1)
export const DEFAULT_PLAN = {
  kcal_target: 1950,
  kcal_min: 1900,
  kcal_max: 2000,
  protein_g_target: 150,
  protein_g_max: 160,
  carbs_g_target: 185,
  fat_g_target: 55,
  fibre_g_target: 30,
  water_ml_target: 3000,
  sleep_hours_target: 7,
  sessions_per_week: 6,
};

export const PB_CAP_G = 30;
export const KCAL_HARD_FLOOR = 1500;
