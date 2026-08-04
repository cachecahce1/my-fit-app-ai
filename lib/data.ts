"use client";
// Shared queries/mutations. Every logging write is a single upsert so a tap
// is saved the moment it happens (survives screen lock — spec §7.1).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { DEFAULT_PLAN } from "@/lib/plan";

export function useUserId() {
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data } = await supabase().auth.getUser();
      return data.user?.id ?? null;
    },
    staleTime: Infinity,
  });
}

export function usePlan() {
  const q = useQuery({
    queryKey: ["plan"],
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
    staleTime: Infinity,
  });
  return { ...q, plan: q.data ?? DEFAULT_PLAN };
}

export function useStepTarget(date: string) {
  return useQuery({
    queryKey: ["stepTarget", date],
    queryFn: async () => {
      const { data } = await supabase()
        .from("step_targets")
        .select("daily_steps")
        .lte("effective_from", date)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.daily_steps ?? 4000;
    },
  });
}

export function useDailyActivity(date: string) {
  return useQuery({
    queryKey: ["activity", date],
    queryFn: async () => {
      const { data } = await supabase()
        .from("daily_activity")
        .select("*")
        .eq("log_date", date)
        .maybeSingle();
      return data;
    },
  });
}

export function useUpsertActivity(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { steps?: number; water_ml?: number }) => {
      const { data: u } = await supabase().auth.getUser();
      const { error } = await supabase()
        .from("daily_activity")
        .upsert(
          { user_id: u.user!.id, log_date: date, ...patch },
          { onConflict: "user_id,log_date" }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activity", date] }),
  });
}

export function useNutritionDay(date: string) {
  return useQuery({
    queryKey: ["nutrition", date],
    queryFn: async () => {
      const { data } = await supabase()
        .from("v_daily_nutrition")
        .select("*")
        .eq("log_date", date)
        .maybeSingle();
      return data;
    },
  });
}

export function useWeightTrend(days = 60) {
  return useQuery({
    queryKey: ["weightTrend", days],
    queryFn: async () => {
      const { data } = await supabase()
        .from("v_weight_trend")
        .select("*")
        .order("log_date", { ascending: false })
        .limit(days);
      return (data ?? []).reverse();
    },
  });
}

export function useBodyMetric(date: string) {
  return useQuery({
    queryKey: ["body", date],
    queryFn: async () => {
      const { data } = await supabase()
        .from("body_metrics")
        .select("*")
        .eq("log_date", date)
        .maybeSingle();
      return data;
    },
  });
}

export function useUpsertBodyMetric(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Record<string, number | null>) => {
      const { data: u } = await supabase().auth.getUser();
      const { error } = await supabase()
        .from("body_metrics")
        .upsert(
          { user_id: u.user!.id, log_date: date, ...patch },
          { onConflict: "user_id,log_date" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["body", date] });
      qc.invalidateQueries({ queryKey: ["weightTrend"] });
    },
  });
}
