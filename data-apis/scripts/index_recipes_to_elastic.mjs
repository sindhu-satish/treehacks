import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { Client as ElasticClient } from "@elastic/elasticsearch";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const ELASTIC_URL = process.env.ELASTIC_URL;
const ELASTIC_API_KEY = process.env.ELASTIC_API_KEY;
const ELASTIC_INDEX = process.env.ELASTIC_INDEX || "recipes";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}
if (!ELASTIC_URL || !ELASTIC_API_KEY) {
  throw new Error("Missing ELASTIC_URL or ELASTIC_API_KEY in .env.local");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const es = new ElasticClient({
  node: ELASTIC_URL,
  auth: { apiKey: ELASTIC_API_KEY },
});

async function ensureIndex() {
  const exists = await es.indices.exists({ index: ELASTIC_INDEX });
  if (exists) return;

  await es.indices.create({
    index: ELASTIC_INDEX,
    mappings: {
        properties: {
            id: { type: "keyword" },
            recipe_name: { type: "text" },
            ingredients_text: { type: "text" },
            allergens: { type: "keyword" },
            cooking_time: { type: "integer" },
            servings: { type: "integer" },
            protein: { type: "float" },
            carbs: { type: "float" },
            fats: { type: "float" },
            event_type: { type: "keyword" },
            image_link: { type: "keyword", index: false },
        },
    },

  });

  console.log(`✅ Created index: ${ELASTIC_INDEX}`);
}

function toIngredientsText(ingredients_list) {
  try {
    if (Array.isArray(ingredients_list)) {
      return ingredients_list
        .map((x) => (typeof x === "string" ? x : x?.name))
        .filter(Boolean)
        .join(" ");
    }
    if (typeof ingredients_list === "string") {
      // could be a plain string OR JSON
      try {
        const parsed = JSON.parse(ingredients_list);
        if (Array.isArray(parsed)) {
          return parsed
            .map((x) => (typeof x === "string" ? x : x?.name))
            .filter(Boolean)
            .join(" ");
        }
      } catch {
        return ingredients_list;
      }
    }
  } catch {}
  return "";
}

async function fetchAllRecipes() {
  const pageSize = 1000;
  let from = 0;
  let all = [];

  while (true) {
    const { data, error } = await supabase
      .from("recipes")
      .select("id,recipe_name,image_link,allergens,ingredients_list,web_link,cooking_time,protein,carbs,fats,servings,instructions,event_type")
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    all = all.concat(data);
    console.log(`Fetched ${all.length} recipes...`);
    from += pageSize;
  }

  return all;
}

async function bulkIndex(recipes) {
  const ops = [];
  for (const r of recipes) {
    ops.push({ index: { _index: ELASTIC_INDEX, _id: r.id } });
    ops.push({
        id: r.id,
        recipe_name: r.recipe_name,
        ingredients_text: toIngredientsText(r.ingredients_list),
        allergens: r.allergens || [],
        cooking_time: r.cooking_time ?? null,
        servings: r.servings ?? null,
        protein: r.protein ?? null,
        carbs: r.carbs ?? null,
        fats: r.fats ?? null,
        event_type: r.event_type ?? null,
        image_link: r.image_link ?? null,
    });
  }

  const resp = await es.bulk({ refresh: true, operations: ops });
  if (resp.errors) {
    const firstErr = resp.items.find((x) => x.index?.error)?.index?.error;
    console.error("Bulk index had errors. First error:", firstErr);
    process.exit(1);
  }

  console.log(`Indexed ${recipes.length} recipes into ${ELASTIC_INDEX}`);
}

async function main() {
  await ensureIndex();
  const recipes = await fetchAllRecipes();
  await bulkIndex(recipes);
  console.log("Done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
