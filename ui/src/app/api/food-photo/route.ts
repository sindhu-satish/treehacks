import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Ok = { ok: true; dish_name: string; calories_estimate: number; confidence: "low" | "medium" | "high"; notes: string };
type Err = { ok: false; error: string; raw?: string };

function extractText(resp: any): string {
  // Responses API usually provides output_text; fallback to walking output blocks.
  if (typeof resp?.output_text === "string" && resp.output_text.trim()) return resp.output_text;

  const out = resp?.output;
  if (Array.isArray(out)) {
    const chunks: string[] = [];
    for (const item of out) {
      const content = item?.content;
      if (Array.isArray(content)) {
        for (const c of content) {
          const t = c?.text || c?.value || c?.content;
          if (typeof t === "string") chunks.push(t);
        }
      }
    }
    return chunks.join("\n").trim();
  }
  return "";
}

function parseJsonLoose(text: string): any | null {
  // Try direct JSON first
  try { return JSON.parse(text); } catch {}

  // Try to grab the first {...} block
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ ok: false, error: "Missing OPENAI_API_KEY in ui/.env.local" } satisfies Err, { status: 500 });

    const form = await req.formData();
    const img = form.get("image");
    if (!(img instanceof File)) {
      return NextResponse.json({ ok: false, error: "Missing image file field 'image'" } satisfies Err, { status: 400 });
    }

    const buf = Buffer.from(await img.arrayBuffer());
    const name = img.name?.toLowerCase?.() ?? "";
    const mime =
        img.type ||
        (name.endsWith(".png") ? "image/png" :
        name.endsWith(".webp") ? "image/webp" :
        name.endsWith(".gif") ? "image/gif" :
        name.endsWith(".avif") ? "image/avif" :
        name.endsWith(".heic") ? "image/heic" :
        name.endsWith(".heif") ? "image/heif" :
        "image/jpeg");

    const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;

    // OpenAI Responses API (text+image input) :contentReference[oaicite:0]{index=0}
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  "You are estimating dish name and total calories from a food photo.\n" +
                  "Return ONLY valid JSON with keys: dish_name (string), calories_estimate (number), confidence (low|medium|high), notes (string).\n" +
                  "Assume a typical single serving. If unsure, pick the most likely dish and explain assumptions in notes.",
              },
              { type: "input_image", image_url: dataUrl },
            ],
          },
        ],
      }),
    });

    const raw = await r.text();
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: `OpenAI error (${r.status})`, raw } satisfies Err, { status: 502 });
    }

    const respJson = JSON.parse(raw);
    const text = extractText(respJson);
    const parsed = parseJsonLoose(text);

    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json({ ok: false, error: "Could not parse model output as JSON", raw: text || raw } satisfies Err, { status: 502 });
    }

    const dish_name = String(parsed.dish_name ?? "").trim();
    const calories_estimate = Number(parsed.calories_estimate);
    const confidence = parsed.confidence === "low" || parsed.confidence === "medium" || parsed.confidence === "high" ? parsed.confidence : "medium";
    const notes = String(parsed.notes ?? "").trim();

    if (!dish_name || Number.isNaN(calories_estimate)) {
      return NextResponse.json({ ok: false, error: "Model returned invalid fields", raw: text } satisfies Err, { status: 502 });
    }

    const out: Ok = {
      ok: true,
      dish_name,
      calories_estimate: Math.round(calories_estimate),
      confidence,
      notes,
    };
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" } satisfies Err, { status: 500 });
  }
}
