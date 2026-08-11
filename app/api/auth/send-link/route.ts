import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Sends the magic link ourselves via Resend, bypassing Supabase's rate-limited
// SMTP. generateLink needs the secret (service role) key — server-side only.
export async function POST(request: NextRequest) {
  const secret = process.env.SUPABASE_SECRET_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const owner = process.env.APP_OWNER_EMAIL;

  if (!secret || secret.includes("PASTE")) {
    return NextResponse.json(
      { error: "SUPABASE_SECRET_KEY missing in .env.local (dashboard → Settings → API keys → secret key)" },
      { status: 500 }
    );
  }
  if (!resendKey || !from) {
    return NextResponse.json({ error: "Resend env vars missing" }, { status: 500 });
  }

  const { email } = (await request.json()) as { email?: string };
  // Single-user app: only the owner may request a login link
  if (!email || email.toLowerCase() !== owner?.toLowerCase()) {
    return NextResponse.json({ error: "Unknown email" }, { status: 403 });
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) {
    return NextResponse.json({ error: error?.message ?? "Could not create link" }, { status: 502 });
  }

  const origin = request.nextUrl.origin;
  const link = `${origin}/auth/confirm?token_hash=${data.properties.hashed_token}&type=magiclink`;

  const send = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `My Fitness App <${from}>`,
      to: [email],
      subject: "Your login link",
      html: `
        <div style="font-family:Arial,sans-serif;background:#0b0d0f;color:#ece9e2;padding:32px;border-radius:16px">
          <p style="color:#ff5a1f;font-size:12px;letter-spacing:2px;margin:0">MY FITNESS APP</p>
          <h1 style="margin:8px 0 24px">Log it or it didn't happen.</h1>
          <a href="${link}"
             style="display:inline-block;background:#ff5a1f;color:#0b0d0f;font-weight:bold;
                    padding:14px 28px;border-radius:12px;text-decoration:none">LOG IN →</a>
          <p style="color:#8a919c;font-size:12px;margin-top:24px">Link works once. Ignore if you didn't request it.</p>
        </div>`,
    }),
  });

  if (!send.ok) {
    const body = await send.text();
    return NextResponse.json({ error: `Resend failed: ${body.slice(0, 200)}` }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
