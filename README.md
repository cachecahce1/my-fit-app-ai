# 🏋️ Greek God Tracker

A personal fitness logging PWA built for one job: **executing a 16-week cut/recomp protocol without guessing**. Dark-mode-first, designed to be used one-handed on a phone between sets, with an AI coach bridge so Claude can review your fortnight from a single JSON snapshot.

Built with Next.js 16, Supabase, Tailwind v4, React Query and Recharts. Meal-photo macro estimation via OpenRouter (`gpt-5-mini`). Login emails via Resend.

> This is a single-user app by design — no feed, no friends, no SaaS. Fork it, replace the seed data with your own plan, and it becomes yours.

## Features

**🏋️ Workout logger** — the reason this exists
- Six seeded training days (PPL×2, aesthetics-biased) with target sets × reps, RPE and rest per exercise
- Every set logged in two taps; weight/reps prefill from your last session ("beat 42.5 kg × 8")
- **Double-progression engine**: when every set tops the rep window at ≤RPE 9, next session shows "➕ add 2.5 kg" with the correct increment per equipment (DB 2.5 / machine 5 / Smith 2.5)
- Stall detection after 3 flat sessions, with the plan's prescribed fixes
- Auto rest timer with vibration; "solo ✓ / assisted" toggle — assisted reps never count toward progression
- Sets save to the database the instant they're logged — a locked phone mid-session loses nothing

**🍛 Nutrition logger** — built for an Indian home kitchen
- Foods measured by **count, not grams**: roti, katori, scoop, slice, glass — because nobody weighs mom's dal
- One-tap saved meals for the daily template
- **📷 Photo logging**: snap a plate, get itemised macros back (tuned for vegetarian Indian portions), edit the numbers, log it. Flags anything that looks non-veg.
- Live "kcal left / protein left" against plan targets
- Guard rails: 30 g/day peanut butter warning, one-treat-per-week counter

**📊 Body & recovery**
- Morning weight with **7-day rolling average** (the only number the plan trusts) charted over the de-emphasised daily line
- Typo guard: entries >3 kg off the average ask for confirmation
- Sunday tape prompts (waist, mid-abdomen, hips) + monthly full measurements
- Sleep (bed/wake → duration), water (+250/+500 ml), daily steps vs a ladder that climbs 4k → 6k → 7.5k, supplement checklist

**🧠 Sunday verdict engine**
- Runs the plan's actual decision rules on your week: `ON TRACK` / `RECOMP` / `TOO FAST` / `STALLED`
- Consistency-contract scoreboard: sessions, protein days, kcal-in-range days, step days, 7h+ nights
- The app recommends; you decide. It never auto-changes targets.

**🤖 AI coach bridge**
- `get_coach_snapshot(from, to)` Postgres function returns plan + daily rollups + sessions + progression + measurements as one JSON
- One-tap 14-day export to paste into a Claude conversation — or point a Supabase MCP server at the project and let Claude query live
- Coaching guardrails are seeded into `coach_notes` so they travel with the data

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + TypeScript |
| Styling | Tailwind CSS v4, custom "Night Iron" design tokens, Barlow Condensed display type |
| Data | Supabase — Postgres, Auth, RLS on every table, analysis views |
| Client state | TanStack React Query |
| Charts | Recharts |
| Vision | OpenRouter → `openai/gpt-5-mini`, strict JSON schema output |
| Auth email | Resend API (bypasses Supabase SMTP limits), magic links via `generateLink` |
| PWA | Web manifest, installable, dark-only |

## Setup

### 1. Supabase (~5 min)
1. Create a free project at [supabase.com](https://supabase.com)
2. SQL Editor → run [`supabase/schema.sql`](supabase/schema.sql) (tables, RLS, views, coach RPC)
3. After your first login (step 4), run [`supabase/seed.sql`](supabase/seed.sql) — **edit it first**: it contains the author's training plan; replace exercises, start weights, foods and targets with yours

### 2. Environment
```bash
cp .env.local.example .env.local
```

| Variable | What | Where |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key (`sb_publishable_…`) | Supabase → Settings → API keys |
| `SUPABASE_SECRET_KEY` | Secret key (`sb_secret_…`), server-side only — used solely to generate login links | Supabase → Settings → API keys |
| `RESEND_API_KEY` | Login-email sender | [resend.com](https://resend.com) → API keys |
| `RESEND_FROM` | Sender address on a domain you've verified in Resend | |
| `APP_OWNER_EMAIL` | The **only** email allowed to log in | you |
| `OPENROUTER_API_KEY` | Photo macro estimation | [openrouter.ai](https://openrouter.ai) → Keys |

### 3. Run
```bash
npm install
npm run dev
```

### 4. Log in
Enter your email → the app emails you a magic link via Resend → click it anywhere (the link is browser-independent). Sessions persist, so this is rare.

### 5. Phone
Deploy to Vercel (`vercel deploy`, add the same env vars) and **Add to Home screen** in Chrome. Or on your LAN: `npm run dev -- -H 0.0.0.0` → `http://<pc-ip>:3000`.

## Architecture notes

- **Timezone**: all `log_date` values are computed in `Asia/Kolkata`; nutrition logged between midnight and 4 AM offers "log to yesterday?" because training days end late
- **Auth**: every page is gated by `proxy.ts` (Next 16's middleware). API routes self-guard and return JSON 401s. The login endpoint only accepts `APP_OWNER_EMAIL`
- **RLS**: every user table enforces `auth.uid() = user_id`; child tables scope through their parent; analysis views run `security_invoker`
- **Photo macros**: images are downscaled client-side to ≤1024 px JPEG (~$0.001/photo), the OpenRouter key never leaves the server, and estimates land as editable numbers — the app treats them as estimates, not truth
- **Hard floors from the plan are in the schema**: kcal target below 1,500 is a database-level `CHECK` violation, not just a UI warning

## Cost to run

Supabase free tier + Vercel free tier + Resend free tier ≈ **$0/month**. Photo logging at five meals a day costs roughly **$0.15/month** in OpenRouter credit.

## License

MIT — see [LICENSE](LICENSE).
