import { NextResponse } from "next/server";

// Pinged daily by Vercel cron (vercel.json) so the free-tier Supabase project
// never pauses for inactivity. Any REST hit counts as activity.
export async function GET() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/plan_versions?select=id&limit=1`,
      { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! }, cache: "no-store" }
    );
    return NextResponse.json({ ok: res.ok });
  } catch {
    // Supabase unreachable (e.g. project paused) — report it, don't crash
    return NextResponse.json({ ok: false, reason: "supabase unreachable" });
  }
}
