// Double-progression engine — spec §6.1.
// Input: working sets of the LAST session for an exercise (clean solo only).

export type LoggedSet = {
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  is_warmup: boolean;
  is_clean_solo: boolean;
};

export type Suggestion =
  | { kind: "increase"; newWeight: number; reason: string }
  | { kind: "repeat"; weight: number | null; targetReps: number | null; reason: string }
  | { kind: "stalled"; reason: string }
  | { kind: "fresh" };

export function suggestNext(
  lastSets: LoggedSet[],
  repMax: number,
  incrementKg: number,
  // top weights of the last 3 sessions, most recent first — for stall detection
  recentTopWeights: number[] = [],
  recentTopReps: number[] = []
): Suggestion {
  const working = lastSets.filter((s) => !s.is_warmup && s.is_clean_solo && s.reps != null);
  if (working.length === 0) return { kind: "fresh" };

  const allTopped = working.every((s) => (s.reps ?? 0) >= repMax && (s.rpe ?? 10) <= 9);
  const lastWeight = Math.max(...working.map((s) => s.weight_kg ?? 0));

  if (allTopped && incrementKg > 0) {
    return {
      kind: "increase",
      newWeight: lastWeight + incrementKg,
      reason: `All sets hit ${repMax} at ≤RPE 9 — add ${incrementKg} kg`,
    };
  }

  // Stalled: same weight, no rep improvement across 3 sessions
  if (
    recentTopWeights.length >= 3 &&
    recentTopWeights.every((w) => w === recentTopWeights[0]) &&
    recentTopReps.length >= 3 &&
    recentTopReps[0] <= recentTopReps[2]
  ) {
    return {
      kind: "stalled",
      reason: "3 sessions without progress — add a rep anywhere, slow the negative, or swap to a sister exercise after 6–8 weeks",
    };
  }

  const bestReps = Math.max(...working.map((s) => s.reps ?? 0));
  return {
    kind: "repeat",
    weight: lastWeight || null,
    targetReps: bestReps || null,
    reason: `Beat last time: ${lastWeight} kg × ${bestReps}`,
  };
}
