/**
 * Mahm agent tools: search_recipes, get_nutrition, find_stores, generate_meal_plan.
 * search_recipes calls data-apis Elasticsearch (POST /api/search_recipes).
 */

const DATA_APIS_URL = process.env.DATA_APIS_URL || "http://localhost:3001";
const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function safeFetch<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

// --- search_recipes (Elasticsearch via data-apis) ---
export type SearchRecipesInput = {
  query: string;
  dietary_filters?: string[];
  max_results?: number;
  exclude_allergens?: string[];
  max_cook_time?: number;
};

const MOCK_RECIPES = [
  {
    id: "r1",
    name: "Lentil Dal",
    ingredients: ["red lentils", "onion", "garlic", "cumin", "turmeric", "coconut milk", "cilantro"],
    cook_time_min: 30,
    cuisine: "Indian",
    dietary_tags: ["vegetarian", "vegan", "gluten-free", "dairy-free"],
    instructions_summary: "Sauté onion and garlic, add spices and lentils, simmer with coconut milk until tender.",
  },
  {
    id: "r2",
    name: "Chickpea Curry",
    ingredients: ["chickpeas", "tomatoes", "onion", "garlic", "ginger", "curry powder", "coconut cream"],
    cook_time_min: 35,
    cuisine: "Indian",
    dietary_tags: ["vegetarian", "vegan", "gluten-free", "dairy-free"],
    instructions_summary: "Sauté aromatics, add curry powder and tomatoes, then chickpeas and coconut cream; simmer.",
  },
  {
    id: "r3",
    name: "Black Bean Tacos",
    ingredients: ["black beans", "tortillas", "avocado", "lime", "red onion", "cilantro", "cumin"],
    cook_time_min: 20,
    cuisine: "Mexican",
    dietary_tags: ["vegetarian", "vegan", "dairy-free"],
    instructions_summary: "Warm beans with cumin, warm tortillas, serve with avocado, lime, onion, and cilantro.",
  },
  {
    id: "r4",
    name: "Greek Chickpea Salad",
    ingredients: ["chickpeas", "cucumber", "tomato", "red onion", "olives", "feta", "olive oil", "oregano"],
    cook_time_min: 15,
    cuisine: "Mediterranean",
    dietary_tags: ["vegetarian", "gluten-free"],
    instructions_summary: "Combine chickpeas and chopped vegetables with olives, feta, olive oil, and oregano.",
  },
  {
    id: "r5",
    name: "Red Lentil Soup",
    ingredients: ["red lentils", "carrots", "celery", "onion", "vegetable broth", "cumin", "lemon"],
    cook_time_min: 25,
    cuisine: "Middle Eastern",
    dietary_tags: ["vegetarian", "vegan", "gluten-free", "dairy-free"],
    instructions_summary: "Sauté vegetables, add lentils and broth, simmer until tender; finish with lemon.",
  },
];

/** Map data-apis Elasticsearch recipe shape to agent-friendly shape */
function mapDataApisRecipe(r: Record<string, unknown>): Record<string, unknown> {
  const ingredients = Array.isArray(r.ingredients) ? r.ingredients : [];
  return {
    id: r.id,
    name: r.title ?? r.name,
    title: r.title,
    ingredients,
    cook_time_min: r.cook_time_min ?? null,
    servings: r.servings ?? null,
    dietary_tags: r.dietary_tags ?? [],
    score: r.score ?? 0,
    image_link: r.image_link ?? null,
  };
}

export async function runSearchRecipes(input: SearchRecipesInput): Promise<string> {
  const url = `${DATA_APIS_URL}/api/search_recipes`;
  const body: Record<string, unknown> = {
    query: input.query.trim() || "recipe",
    max_results: Math.min(input.max_results ?? 5, 25),
    dietary_filters: input.dietary_filters ?? [],
  };
  if (input.exclude_allergens?.length) body.exclude_allergens = input.exclude_allergens;
  if (input.max_cook_time != null && !Number.isNaN(input.max_cook_time)) body.max_cook_time = input.max_cook_time;

  let apiRecipes: unknown[] = [];
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = (await res.json()) as { recipes?: unknown[] };
      apiRecipes = Array.isArray(data?.recipes) ? data.recipes : [];
    }
  } catch {
    // fall through to mock
  }

  const recipes =
    apiRecipes.length > 0
      ? apiRecipes.map((r) => mapDataApisRecipe(r as Record<string, unknown>))
      : MOCK_RECIPES.filter((r) => {
          const q = (input.query || "").toLowerCase();
          const matchName = q ? r.name.toLowerCase().includes(q) : true;
          const matchTags = (input.dietary_filters ?? []).every((f) =>
            r.dietary_tags.some((t) => t.toLowerCase().includes(f.toLowerCase()))
          );
          return matchName && (input.dietary_filters?.length ? matchTags : true);
        }).slice(0, input.max_results ?? 5);

  return JSON.stringify(recipes, null, 2);
}

// --- get_nutrition ---
export type GetNutritionInput = { food_item?: string; recipe_id?: string };

const MOCK_NUTRITION: Record<string, { calories: number; protein_g: number; carbs_g: number; fat_g: number; iron_mg?: number }> = {
  "lentil dal": { calories: 280, protein_g: 14, carbs_g: 42, fat_g: 6, iron_mg: 4.2 },
  "red lentils": { calories: 230, protein_g: 18, carbs_g: 40, fat_g: 0.8, iron_mg: 6.6 },
  chickpeas: { calories: 269, protein_g: 14.5, carbs_g: 45, fat_g: 4.2, iron_mg: 4.7 },
  "chickpea curry": { calories: 320, protein_g: 12, carbs_g: 38, fat_g: 14, iron_mg: 3.8 },
  "black bean tacos": { calories: 380, protein_g: 14, carbs_g: 52, fat_g: 14 },
  "black beans": { calories: 227, protein_g: 15.2, carbs_g: 40.8, fat_g: 0.9, iron_mg: 3.6 },
  tofu: { calories: 76, protein_g: 8, carbs_g: 1.9, fat_g: 4.8 },
  "greek chickpea salad": { calories: 290, protein_g: 11, carbs_g: 28, fat_g: 16 },
  "red lentil soup": { calories: 220, protein_g: 12, carbs_g: 36, fat_g: 4, iron_mg: 3.2 },
};

export async function runGetNutrition(input: GetNutritionInput): Promise<string> {
  const key = (input.food_item || input.recipe_id || "").toLowerCase().trim();
  const apiData = await safeFetch<unknown>(
    `${BASE}/api/nutrition?food=${encodeURIComponent(key)}&recipe_id=${encodeURIComponent(input.recipe_id || "")}`,
    null
  );
  if (apiData && typeof apiData === "object") return JSON.stringify(apiData, null, 2);

  const recipeName = input.recipe_id ? MOCK_RECIPES.find((r) => r.id === input.recipe_id)?.name?.toLowerCase() : "";
  const normalized = (key || recipeName || "").trim();
  const match = Object.entries(MOCK_NUTRITION).find(([k]) => normalized && (normalized.includes(k) || k.includes(normalized)));
  const data = match
    ? match[1]
    : { calories: 200, protein_g: 10, carbs_g: 30, fat_g: 6, note: "Estimated; use USDA FoodData for exact values." };
  return JSON.stringify(data, null, 2);
}

// --- find_stores ---
export type FindStoresInput = { ingredient_list: string[]; zip_code: string };

const MOCK_STORES = [
  { name: "Trader Joe's", distance_mi: 1.2, items: ["red lentils", "coconut milk", "cumin"], total_estimate: 12 },
  { name: "Safeway", distance_mi: 0.8, items: ["red lentils", "coconut milk", "cumin"], total_estimate: 14 },
  { name: "Whole Foods", distance_mi: 2.1, items: ["red lentils", "coconut milk", "cumin"], total_estimate: 18 },
];

export async function runFindStores(input: FindStoresInput): Promise<string> {
  const apiData = await safeFetch<unknown>(
    `${BASE}/api/marketplace?ingredients=${encodeURIComponent(JSON.stringify(input.ingredient_list))}&zip=${encodeURIComponent(input.zip_code)}`,
    null
  );
  if (apiData && typeof apiData === "object") return JSON.stringify(apiData, null, 2);

  const stores = MOCK_STORES.map((s) => ({
    ...s,
    items: input.ingredient_list.slice(0, 5),
    zip: input.zip_code,
  }));
  return JSON.stringify(stores, null, 2);
}

// --- generate_meal_plan (stub) ---
export type GenerateMealPlanInput = {
  preferences: string;
  num_days?: number;
  budget?: string;
  schedule?: string;
};

export async function runGenerateMealPlan(input: GenerateMealPlanInput): Promise<string> {
  const apiData = await safeFetch<unknown>(
    `${BASE}/api/meal-plan?preferences=${encodeURIComponent(input.preferences)}&days=${input.num_days ?? 7}&budget=${encodeURIComponent(input.budget ?? "")}`,
    null
  );
  if (apiData && typeof apiData === "object") return JSON.stringify(apiData, null, 2);

  const days = input.num_days ?? 7;
  const mockPlan = {
    plan: Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      breakfast: "Oatmeal with banana",
      lunch: "Chickpea salad",
      dinner: ["Lentil dal", "Chickpea curry", "Black bean tacos", "Red lentil soup", "Greek chickpea salad", "Lentil dal", "Chickpea curry"][i],
    })),
    grocery_list: ["red lentils", "chickpeas", "black beans", "coconut milk", "onions", "garlic", "cumin", "turmeric", "tortillas", "avocado", "tomatoes", "cucumber"],
    total_estimated_cost_usd: 73,
    daily_nutrition_estimate: { calories: 1800, protein_g: 75, carbs_g: 220, fat_g: 65 },
    note: "Stub plan; full algorithm from Person A will replace this.",
  };
  return JSON.stringify(mockPlan, null, 2);
}

// --- Tool runner with graceful failure ---
export type ToolName = "search_recipes" | "get_nutrition" | "find_stores" | "generate_meal_plan";

export async function runTool(name: ToolName, input: unknown): Promise<string> {
  try {
    switch (name) {
      case "search_recipes":
        return runSearchRecipes(input as SearchRecipesInput);
      case "get_nutrition":
        return runGetNutrition(input as GetNutritionInput);
      case "find_stores":
        return runFindStores(input as FindStoresInput);
      case "generate_meal_plan":
        return runGenerateMealPlan(input as GenerateMealPlanInput);
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool failed";
    return JSON.stringify({ error: message, tool: name });
  }
}
