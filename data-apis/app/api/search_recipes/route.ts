import { NextResponse } from "next/server";
import { Client as ElasticClient } from "@elastic/elasticsearch";

export const runtime = "nodejs";

function getEsClient() {
  const node = process.env.ELASTIC_URL;
  const apiKey = process.env.ELASTIC_API_KEY;

  if (!node || !apiKey) {
    throw new Error("Missing ELASTIC_URL or ELASTIC_API_KEY in .env.local");
  }

  return new ElasticClient({
    node,
    auth: { apiKey },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query: string = (body?.query || "").trim();
    const dietary_filters: string[] = body?.dietary_filters || [];
    const max_results: number = Math.min(Number(body?.max_results || 10), 25);
    const exclude_allergens: string[] = body?.exclude_allergens || [];
    const max_cook_time: number | null = body?.max_cook_time != null ? Number(body.max_cook_time) : null;

    if (!query) {
      return NextResponse.json({ recipes: [] });
    }

    const index = process.env.ELASTIC_INDEX || "recipes_v1";
    const es = getEsClient();

    // NOTE: your Supabase schema uses allergens + event_type.
    // We only filter if user provided filters AND they match fields we have.
    // If you later add dietary tags, you can extend this.
    const must: any[] = [
      {
        multi_match: {
          query,
          fields: ["recipe_name^3", "ingredients_text"],
          fuzziness: "AUTO",
        },
      },
    ];

    const filter: any[] = [];
    const must_not: any[] = [];

    if (max_cook_time != null && !Number.isNaN(max_cook_time)) {
      filter.push({ range: { cooking_time: { lte: max_cook_time } } });
    }

    for (const a of exclude_allergens) {
      const allergen = (a || "").toString().trim();
      if (!allergen) continue;

      // 1) structured exclusion (best when data is clean)
      must_not.push({ term: { allergens: allergen } });

      // 2) fallback exclusion against ingredients text (covers messy allergen tagging)
      if (allergen.toLowerCase() === "dairy") {
        must_not.push({
          bool: {
            should: [
              // ingredients_text checks (existing)
              { match_phrase: { ingredients_text: "milk" } },
              { match_phrase: { ingredients_text: "cheese" } },
              { match_phrase: { ingredients_text: "butter" } },
              { match_phrase: { ingredients_text: "yogurt" } },
              { match_phrase: { ingredients_text: "cream" } },
              { match_phrase: { ingredients_text: "whey" } },
              { match_phrase: { ingredients_text: "parmesan" } },
              { match_phrase: { ingredients_text: "mozzarella" } },
              { match_phrase: { ingredients_text: "feta" } },

              // ✅ add TITLE checks
              { match_phrase: { recipe_name: "cheese" } },
              { match_phrase: { recipe_name: "brie" } },
              { match_phrase: { recipe_name: "mozzarella" } },
              { match_phrase: { recipe_name: "parmesan" } },
              { match_phrase: { recipe_name: "feta" } },
              { match_phrase: { recipe_name: "cream" } },
            ],
            minimum_should_match: 1,
          },
        });
      }
    }

    const resp = await es.search({
      index,
      size: max_results,
      query: {
        bool: { must, filter, must_not },
      },
    });


    const recipes = (resp.hits.hits || []).map((h: any) => {
      const s = h._source || {};
      return {
        id: h._id,
        title: s.recipe_name,
        cook_time_min: s.cooking_time ?? null,
        servings: s.servings ?? null,
        allergens: s.allergens ?? [],
        ingredients: s.ingredients_text
          ? s.ingredients_text.split(/\s*\|\s*/).map((x: string) => x.trim()).filter(Boolean).slice(0, 40)
          : [],
        score: h._score ?? 0,
        image_link: s.image_link ?? null,
      };
    });

    return NextResponse.json({ recipes });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
