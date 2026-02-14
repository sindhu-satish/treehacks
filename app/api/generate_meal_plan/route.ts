import { supabase } from "../../../lib/supabase";
import { estimateItemCost } from "../../../data/price_estimates";

export const runtime = "nodejs";

function norm(s: string) {
  return (s || "").toLowerCase().trim();
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const preferences = body?.preferences || {};
    const dietary_filters: string[] = (preferences?.dietary_filters || []).map(norm);
    const num_days: number = Math.max(3, Math.min(Number(body?.num_days || 3), 7));
    const budget: number | null =
      body?.budget != null ? Number(body.budget) : preferences?.budget != null ? Number(preferences.budget) : null;

    // Grab recipes
    const { data, error } = await supabase
      .from("recipes")
      .select("id,title,cuisine,cook_time_min,servings,dietary_tags,ingredients,instructions")
      .limit(300);

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    const rows = (data || []) as any[];

    // Filter by tags
    const candidates = rows.filter((r) => {
      if (dietary_filters.length === 0) return true;
      const tags = (r.dietary_tags || []).map(norm);
      return dietary_filters.every((t) => tags.includes(t));
    });

    if (candidates.length === 0) {
      return Response.json(
        { ok: false, error: "No recipes match dietary filters. Add more recipes or loosen filters." },
        { status: 404 }
      );
    }

    // Simple variety heuristic: avoid repeating the same “key ingredient” back-to-back
    // Key ingredient = first ingredient name, fallback to title
    const picked: any[] = [];
    const usedKeys: string[] = [];

    for (const r of candidates) {
      if (picked.length >= num_days) break;
      const ing0 = r.ingredients?.[0]?.name ? norm(r.ingredients[0].name) : norm(r.title);
      const last = usedKeys[usedKeys.length - 1];
      if (last && ing0 === last) continue;
      picked.push(r);
      usedKeys.push(ing0);
    }

    // If still short, just fill
    let i = 0;
    while (picked.length < num_days && i < candidates.length) {
      const r = candidates[i++];
      if (!picked.find((x) => x.id === r.id)) picked.push(r);
    }

    if (picked.length < num_days) {
        return Response.json(
            { ok: false, error: `Not enough recipes to build ${num_days}-day plan. Have ${picked.length}. Add more recipes.` },
            { status: 400 }
        );
    } 

    // Build grocery list + cost
    const groceryItems: { name: string; estimated_cost_usd: number }[] = [];
    for (const r of picked) {
      const ings = (r.ingredients || []).map((x: any) => norm(x?.name || "")).filter(Boolean);
      for (const ing of ings) {
        groceryItems.push({ name: ing, estimated_cost_usd: estimateItemCost(ing) });
      }
    }

    // Aggregate costs by ingredient
    const costMap = new Map<string, number>();
    for (const it of groceryItems) {
      costMap.set(it.name, (costMap.get(it.name) || 0) + it.estimated_cost_usd);
    }

    const grocery_list = Array.from(costMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, cost]) => ({ name, estimated_cost_usd: Number(cost.toFixed(2)) }));

    const total_cost = grocery_list.reduce((s, x) => s + x.estimated_cost_usd, 0);

    // If budget exists, attach a warning
    const budget_status =
      budget == null
        ? { ok: true, note: "No budget provided" }
        : total_cost <= budget
        ? { ok: true, note: `Estimated ${total_cost.toFixed(2)} within budget ${budget.toFixed(2)}` }
        : { ok: false, note: `Estimated ${total_cost.toFixed(2)} exceeds budget ${budget.toFixed(2)}` };

    const plan = picked.map((r, idx) => ({
      day: idx + 1,
      meal: "dinner",
      recipe: {
        id: r.id,
        title: r.title,
        cook_time_min: r.cook_time_min ?? null,
        cuisine: r.cuisine ?? null,
        dietary_tags: r.dietary_tags ?? [],
        ingredients: r.ingredients ?? [],
        instructions: r.instructions ?? "",
      },
    }));

    return Response.json({
      num_days,
      preferences: { dietary_filters },
      plan,
      grocery_list,
      estimated_total_cost_usd: Number(total_cost.toFixed(2)),
      budget_status,
    });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
