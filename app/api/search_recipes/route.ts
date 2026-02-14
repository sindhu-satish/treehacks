import { supabase } from "../../../lib/supabase";

export const runtime = "nodejs";

function normalize(s: string) {
  return (s || "").toLowerCase().trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query: string = body?.query || "";
    const dietary_filters: string[] = body?.dietary_filters || [];
    const max_results: number = Math.min(Number(body?.max_results || 10), 20);

    const q = normalize(query);
    const filters = dietary_filters.map(normalize).filter(Boolean);

    // Pull a small batch (we’ll do smarter ranking locally for MVP)
    const { data, error } = await supabase
      .from("recipes")
      .select("id,title,cuisine,cook_time_min,servings,dietary_tags,ingredients,instructions")
      .limit(200);

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    const rows = (data || []) as any[];

    const scored = rows
      .filter((r) => {
        if (!q) return true;

        const hay = normalize(`${r.title} ${r.cuisine ?? ""} ${JSON.stringify(r.ingredients ?? [])}`);
        return hay.includes(q);
      })
      .filter((r) => {
        if (filters.length === 0) return true;
        const tags = (r.dietary_tags || []).map(normalize);
        return filters.every((f) => tags.includes(f));
      })
      .map((r) => {
        const title = normalize(r.title);
        let score = 0;

        if (q) {
          if (title === q) score += 10;
          if (title.includes(q)) score += 5;

          const ing = normalize(JSON.stringify(r.ingredients ?? []));
          if (ing.includes(q)) score += 2;
        } else {
          score += 1;
        }

        // slight boost for beginner-friendly if present
        const tags = (r.dietary_tags || []).map(normalize);
        if (tags.includes("beginner_friendly")) score += 1;

        return { ...r, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, max_results)
      .map((r) => ({
        id: r.id,
        title: r.title,
        cuisine: r.cuisine ?? undefined,
        cook_time_min: r.cook_time_min ?? undefined,
        servings: r.servings ?? undefined,
        dietary_tags: r.dietary_tags ?? [],
        ingredients: r.ingredients ?? [],
        score: r.score,
      }));

    return Response.json({ recipes: scored });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
