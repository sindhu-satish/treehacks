import { supabase } from "../../../lib/supabase";

export const runtime = "nodejs";

const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";

function norm(s: string) {
  return (s || "").toLowerCase().trim();
}

function pickById(food: any, nutrientId: number): number | null {
  const nutrients = food?.foodNutrients || [];
  for (const n of nutrients) {
    const id = n?.nutrientId ?? n?.nutrient?.id;
    if (id === nutrientId) {
      const v = n?.amount ?? n?.value; // USDA often uses "amount"
      return typeof v === "number" ? v : v != null ? Number(v) : null;
    }
  }
  return null;
}


function pickByName(food: any, names: string[]): number | null {
  const nutrients = food?.foodNutrients || [];
  for (const n of nutrients) {
    const name = norm(n?.nutrientName || n?.nutrient?.name || "");
    if (names.some((x) => name === norm(x))) {
      const v = n?.amount ?? n?.value;
      return typeof v === "number" ? v : v != null ? Number(v) : null;
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const food_item: string | undefined = body?.food_item;

    if (!food_item || !food_item.trim()) {
      return Response.json({ ok: false, error: "Missing food_item" }, { status: 400 });
    }

    const key = `food:${norm(food_item)}`;

    // Cache check
    const cached = await supabase
      .from("nutrition_cache")
      .select("*")
      .eq("key", key)
      .maybeSingle();

    if (cached.data) {
      return Response.json({
        item_name: cached.data.item_name,
        source: "USDA",
        fdcId: cached.data.fdc_id,
        nutrients: {
          calories_kcal: cached.data.calories_kcal,
          protein_g: cached.data.protein_g,
          iron_mg: cached.data.iron_mg,
        },
        confidence: cached.data.confidence,
        cached: true,
      });
    }

    const apiKey = process.env.USDA_API_KEY;
    if (!apiKey) {
      return Response.json({ ok: false, error: "Missing USDA_API_KEY in .env.local" }, { status: 500 });
    }

    // Search USDA
    const searchRes = await fetch(`${USDA_BASE}/foods/search?api_key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: food_item, pageSize: 5 }),
    });

    if (!searchRes.ok) {
      const txt = await searchRes.text();
      return Response.json({ ok: false, error: `USDA search failed: ${txt}` }, { status: 502 });
    }

    const searchJson: any = await searchRes.json();
    const first = searchJson?.foods?.[0];
    if (!first?.fdcId) {
      return Response.json({ ok: false, error: "No USDA match found" }, { status: 404 });
    }

    const fdcId = first.fdcId;

    // Fetch details (nutrients live here)
    const foodRes = await fetch(`${USDA_BASE}/food/${fdcId}?api_key=${encodeURIComponent(apiKey)}`, {
      method: "GET",
    });

    if (!foodRes.ok) {
      const txt = await foodRes.text();
      return Response.json({ ok: false, error: `USDA food fetch failed: ${txt}` }, { status: 502 });
    }

    const foodJson: any = await foodRes.json();


    const calories =
        pickById(foodJson, 1008) ?? pickByName(foodJson, ["Energy"]);

    const protein =
        pickById(foodJson, 1003) ?? pickByName(foodJson, ["Protein"]);

    const iron =
        pickById(foodJson, 1089) ?? pickByName(foodJson, ["Iron, Fe", "Iron"]);


    const confidence = calories != null && protein != null && iron != null ? "high" : "medium";

    // Write cache (store 0 if missing)
    await supabase.from("nutrition_cache").upsert({
      key,
      fdc_id: fdcId,
      item_name: foodJson?.description || food_item,
      calories_kcal: calories ?? 0,
      protein_g: protein ?? 0,
      iron_mg: iron ?? 0,
      confidence,
      updated_at: new Date().toISOString(),
    });

    return Response.json({
      item_name: foodJson?.description || food_item,
      source: "USDA",
      fdcId,
      nutrients: {
        calories_kcal: calories ?? 0,
        protein_g: protein ?? 0,
        iron_mg: iron ?? 0,
      },
      confidence,
      cached: false,
    });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
