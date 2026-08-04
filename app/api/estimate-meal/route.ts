import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Photo/text → macro estimate via OpenRouter. Key never leaves the server.
// Override the model per-env without touching code.
const MODEL = process.env.MEAL_MODEL ?? "openai/gpt-5-mini";

const SCHEMA = {
  type: "object",
  properties: {
    description: { type: "string", description: "Short name for the meal, e.g. 'Paneer bhurji + 2 roti'" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          portion: { type: "string", description: "Portion in Indian units where natural: katori, roti, piece, tsp" },
        },
        required: ["name", "portion"],
        additionalProperties: false,
      },
    },
    kcal: { type: "number" },
    protein_g: { type: "number" },
    carbs_g: { type: "number" },
    fat_g: { type: "number" },
    fibre_g: { type: "number" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
  },
  required: ["description", "items", "kcal", "protein_g", "carbs_g", "fat_g", "fibre_g", "confidence"],
  additionalProperties: false,
};

export async function POST(request: NextRequest) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY missing — add it to .env.local and restart." },
      { status: 500 }
    );
  }

  // Only logged-in users may spend tokens
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { image, note } = (await request.json()) as { image?: string; note?: string };
  const hasImage = Boolean(image?.startsWith("data:image/"));
  if (!hasImage && !note?.trim()) {
    return NextResponse.json({ error: "Send a photo or describe the meal" }, { status: 400 });
  }
  if (hasImage && image!.length > 3_000_000) {
    return NextResponse.json({ error: "Image too large — retake or crop" }, { status: 413 });
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2500,
      // gpt-5-mini is a reasoning model — unbounded reasoning eats the whole
      // token budget and returns empty content. Low effort is plenty here.
      reasoning: { effort: "low" },
      response_format: {
        type: "json_schema",
        json_schema: { name: "meal_estimate", strict: true, schema: SCHEMA },
      },
      messages: [
        {
          role: "system",
          content:
            "You estimate macros from a single food photo for a vegetarian Indian home kitchen (Gujarat). " +
            "Think in Indian portions: katori (~150 ml bowl), roti/phulka, tsp of oil. " +
            "Home sabzi and dal typically carry 1-2 tsp oil per katori — include it. " +
            "Identify foods accurately — if the dish appears to contain meat, fish or eggs, name it " +
            "truthfully and prefix the description with '⚠ non-veg?' (the user is vegetarian and needs to know). " +
            "Paneer may be high-protein paneer (25 g protein/100 g). Be realistic, not optimistic: " +
            "when unsure between two portion sizes, pick the larger for kcal and the smaller for protein. " +
            "The user is on a 1,950 kcal cut and needs honest numbers.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: hasImage
                ? note?.trim()
                  ? `Estimate the macros of this meal. My note: ${note.trim()}`
                  : "Estimate the macros of this meal."
                : `Estimate the macros of this meal from my description alone (no photo): ${note!.trim()}`,
            },
            ...(hasImage ? [{ type: "image_url" as const, image_url: { url: image! } }] : []),
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json({ error: `Model call failed (${res.status}): ${body.slice(0, 200)}` }, { status: 502 });
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  try {
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json({ error: "Model returned unparseable output — try again" }, { status: 502 });
  }
}
