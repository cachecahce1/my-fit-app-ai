# 🏋️ Greek God Tracker

A personal fitness logging PWA built for one job: **executing a 16-week cut/recomp protocol without guessing**. Dark-mode-first, designed to be used one-handed on a phone between sets, with an AI coach bridge so Claude can review your fortnight from a single JSON snapshot.

Built with Next.js 16, Supabase, Tailwind v4, React Query and Recharts. AI meal logging via OpenRouter. Login emails via Resend.

> This is a single-user app by design — no feed, no friends, no SaaS. Fork it, replace the seed data with your own plan, and it becomes yours.

## Features

**🏋️ Workout logger** — the reason this exists
- Six seeded training days (L-P-P-P-P-L split) shown in weekday order; tap one to **preview the full day** — exercises, rep windows, RPE, working weights — then start it with an explicit button
- Day-specific 8-minute warm-up card on every session (prep drills + the 50/70/85% ramp)
- Every set logged in two taps; weight/reps prefill from your last session ("beat 42.5 kg × 8")
- **Double-progression engine**: when every set tops the rep window at ≤RPE 9, next session shows "➕ add 2.5 kg" with the correct increment per equipment (DB 2.5 / machine 5 / Smith 2.5)
- Stall detection after 3 flat sessions; auto rest timer with vibration; "solo ✓ / assisted" toggle — assisted reps never count toward progression
- **Cardio finisher logging** on the summary screen, prefilled with the plan's protocol (incline walk on push/pull days, easy cycle on leg days)
- **📈 Exercise history**: per-exercise step chart of top-set weight over time, total gain since day one, and a session-by-session log (volume, avg RPE)
- Sets save to the database the instant they're logged — a locked phone mid-session loses nothing

**🍛 Nutrition logger** — built for an Indian home kitchen
- Foods measured by **count, not grams**: roti, katori, scoop, slice, glass — because nobody weighs mom's dal
- One-tap saved meals for the daily template
- **🤖 AI meal logging, three ways**: snap a photo, photo + note, or **just type it** ("2 roti + paneer bhurji + 1 katori dal"). An OpenRouter vision model returns itemised macros with a confidence rating — you review and edit the numbers before anything is saved. Flags anything that looks non-veg. Model is env-configurable (`MEAL_MODEL`), ~$0.0005 per estimate
- Live "kcal left / protein left" against plan targets, plus carbs / fat / fibre running totals
- Guard rails: 30 g/day peanut butter warning, one-treat-per-week counter, after-midnight "log to yesterday?"

**📊 Body & recovery**
- Morning weight with **7-day rolling average** (the only number the plan trusts) charted over the de-emphasised daily line; typo guard on entries >3 kg off the average
- Sunday tape prompts (waist, mid-abdomen, hips) + monthly full measurements
- **V-taper ratio card**: shoulders ÷ waist against the 1.60× Greek target, appears once both are taped
- **📷 Progress photos**: 4-pose shoots (front / side L / side R / back) straight from the camera, downscaled on-device, stored in a **private** bucket under per-user RLS, rendered via signed URLs only. Tap two dates for a side-by-side compare. The Body tab nags every 14 days
- Sleep (bed/wake → duration), water (+250/+500 ml), steps vs a ladder that climbs 4k → 6k → 7.5k
- Daily checklists: supplements + the plan's habits (morning light, caffeine cutoff, posture routine, ab vacuums, gut log)
- **Week & phase awareness**: "Week 3 · Cut block 1" chip on Today, with a deload warning in week 7

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
| Framework | Next.js 16 (App Router, Turbopack) + TypeScript, pnpm |
| Styling | Tailwind CSS v4, custom "Night Iron" design tokens, Barlow Condensed display type |
| Data | Supabase — Postgres, Auth, Storage, RLS on every table, analysis views |
| Client state | TanStack React Query |
| Charts | Recharts |
| Vision/LLM | OpenRouter (default `openai/gpt-5-mini`, override via `MEAL_MODEL`), strict JSON schema output |
| Auth email | Resend API — the app generates its own magic links (`generateLink`) and emails them itself, bypassing Supabase's rate-limited SMTP. Only `APP_OWNER_EMAIL` may log in |
| Uptime | `/api/keepalive` + Vercel daily cron so the free-tier Supabase project never pauses for inactivity |
| PWA | Web manifest, installable, dark-only |

## Setup

### 1. Supabase (~5 min)
1. Create a free project at [supabase.com](https://supabase.com)
2. SQL Editor → run [`supabase/schema.sql`](supabase/schema.sql) (tables, RLS, views, private photo bucket, coach RPC)
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
| `OPENROUTER_API_KEY` | Photo/text macro estimation | [openrouter.ai](https://openrouter.ai) → Keys |
| `MEAL_MODEL` | Optional — vision model for meal estimates (default `openai/gpt-5-mini`) | |

### 3. Run
```bash
pnpm install
pnpm dev
```

### 4. Log in
Enter your email → the app emails you a magic link via Resend → click it anywhere (the link is browser-independent). Sessions persist, so this is rare.

### 5. Phone
Deploy to Vercel (import the repo, add the same env vars — the daily keep-alive cron registers automatically from `vercel.json`) and **Add to Home screen** in Chrome.

## Architecture notes

- **Timezone**: all `log_date` values are computed in `Asia/Kolkata`; nutrition logged between midnight and 4 AM offers "log to yesterday?" because training days end late
- **Auth**: every page is gated by `proxy.ts` (Next 16's middleware). API routes self-guard and return JSON 401s. The login endpoint only accepts `APP_OWNER_EMAIL`
- **RLS**: every user table enforces `auth.uid() = user_id`; child tables scope through their parent; analysis views run `security_invoker`; the photo bucket restricts objects to the owner's folder
- **AI estimates are estimates**: images are downscaled client-side to ≤1024 px JPEG, the OpenRouter key never leaves the server, and results land as editable numbers before anything is saved
- **Hard floors from the plan are in the schema**: kcal target below 1,500 is a database-level `CHECK` violation, not just a UI warning

## Cost to run

Supabase free tier + Vercel free tier + Resend free tier ≈ **$0/month**. AI meal logging at five meals a day costs under **$0.10/month** in OpenRouter credit.

## License

MIT — see [LICENSE](LICENSE).
