"use client";
import { useState } from "react";
import { hasSupabaseEnv } from "@/lib/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  if (!hasSupabaseEnv) {
    return (
      <div className="flex min-h-[80vh] flex-col justify-center gap-4">
        <h1 className="display text-4xl font-bold uppercase">Setup needed</h1>
        <div className="card space-y-3 p-5 text-sm text-mut">
          <p>Supabase isn&apos;t connected yet. In the project root:</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>Create a free project at supabase.com</li>
            <li>
              Copy <code className="text-ink">.env.local.example</code> to{" "}
              <code className="text-ink">.env.local</code> and paste your project URL + anon key
            </li>
            <li>
              Run <code className="text-ink">supabase/schema.sql</code> in the SQL editor
            </li>
            <li>Restart the dev server, log in, then run <code className="text-ink">supabase/seed.sql</code></li>
          </ol>
        </div>
      </div>
    );
  }

  async function send() {
    if (!email) return;
    setState("sending");
    try {
      const res = await fetch("/api/auth/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Send failed");
      setState("sent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
      setState("error");
    }
  }

  return (
    <div className="flex min-h-[80vh] flex-col justify-center gap-8">
      <div className="rise rise-1">
        <p className="label text-ember">Greek God Protocol</p>
        <h1 className="display mt-1 text-5xl font-bold uppercase leading-[0.95]">
          Log it
          <br />
          or it didn&apos;t
          <br />
          happen.
        </h1>
      </div>

      {state === "sent" ? (
        <div className="card rise rise-2 p-5">
          <p className="display text-xl font-semibold">Check your email</p>
          <p className="mt-1 text-sm text-mut">
            Magic link sent to <span className="text-ink">{email}</span>. Open it on this device.
          </p>
        </div>
      ) : (
        <div className="rise rise-2 space-y-3">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            className="card w-full px-4 py-4 text-lg outline-none placeholder:text-faint focus:border-ember"
          />
          <button
            onClick={send}
            disabled={state === "sending"}
            className="tap display w-full rounded-2xl bg-ember py-4 text-lg font-bold uppercase tracking-wide text-bg disabled:opacity-60"
          >
            {state === "sending" ? "Sending…" : "Send magic link"}
          </button>
          {state === "error" && <p className="text-sm text-bad">{error}</p>}
        </div>
      )}
    </div>
  );
}
