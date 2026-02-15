/**
 * Proxy to data-apis search_recipes. Returns recipe array for agent tools.
 */
import { NextResponse } from "next/server";

const DATA_APIS_URL = process.env.DATA_APIS_URL || "http://localhost:3001";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    const maxResults = Math.min(Number(searchParams.get("max_results") || 5), 20);
    const dietaryFiltersParam = searchParams.get("dietary_filters");
    const dietary_filters = dietaryFiltersParam
      ? (JSON.parse(dietaryFiltersParam) as string[])
      : [];

    const res = await fetch(`${DATA_APIS_URL}/api/search_recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, dietary_filters, max_results: maxResults }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: err || "Recipe API failed" },
        { status: res.status }
      );
    }

    const data = (await res.json()) as { recipes?: unknown[] };
    const recipes = Array.isArray(data?.recipes) ? data.recipes : [];

    // Map to agent-friendly shape: title -> name, normalize ingredients
    const mapped = recipes.map((r) => {
      const rec = r as Record<string, unknown>;
      return {
        id: rec.id,
        name: rec.title ?? rec.name,
        title: rec.title,
        ingredients: normalizeIngredients(rec.ingredients),
        cook_time_min: rec.cook_time_min,
        cuisine: rec.cuisine,
        servings: rec.servings,
        dietary_tags: rec.dietary_tags ?? [],
        score: rec.score,
      };
    });

    return NextResponse.json(mapped);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function normalizeIngredients(ing: unknown): string[] {
  if (!ing) return [];
  if (Array.isArray(ing)) {
    return ing.map((i) =>
      typeof i === "string" ? i : (i as { name?: string }).name ?? String(i)
    );
  }
  return [];
}
