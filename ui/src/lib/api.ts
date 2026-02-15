/**
 * Backend API client (Flask on port 5000).
 * Set NEXT_PUBLIC_BACKEND_URL in .env (e.g. http://localhost:5000).
 * Auth: use X-User-Id header (user_id from login/register) for protected routes.
 */
import type { Store, GroceryComparison, CartItem } from "@/types";

declare const process: { env?: Record<string, string | undefined> };
const BACKEND_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BACKEND_URL) ||
  "http://localhost:5000";

/** Mahm chat agent (multiagents). Intent + tool calls. Set NEXT_PUBLIC_MAHM_URL (e.g. http://localhost:3000). */
const MAHM_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_MAHM_URL) ||
  "http://localhost:3000";

function headers(userId?: string | null): HeadersInit {
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (userId) (h as Record<string, string>)["X-User-Id"] = userId;
  return h;
}

/** GET /api/health */
export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

/** Recipe shape returned from chat when search_recipes ran */
export interface ChatRecipe {
  id: string;
  name: string;
  cook_time_min?: number | null;
  ingredients?: string[];
  dietary_tags?: string[];
  image_link?: string | null;
}

/** POST /api/chat — Mahm agent with intent classification and tool calls (search_recipes, get_nutrition, etc.). */
export async function sendChatMessage(messages: { role: "user" | "assistant"; content: string }[]): Promise<{
  text: string;
  toolCalls: { name: string; input: unknown }[];
  recipes?: ChatRecipe[];
  error?: string;
}> {
  const res = await fetch(`${MAHM_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Chat failed: ${res.status}`);
  const recipes = Array.isArray(data.recipes)
    ? (data.recipes as ChatRecipe[]).map((r) => ({
        id: String(r.id),
        name: String(r.name ?? ""),
        cook_time_min: r.cook_time_min ?? null,
        ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
        dietary_tags: Array.isArray(r.dietary_tags) ? r.dietary_tags : [],
        image_link: typeof r.image_link === "string" ? r.image_link : null,
      }))
    : undefined;
  return {
    text: data.text ?? "",
    toolCalls: Array.isArray(data.toolCalls) ? data.toolCalls : [],
    recipes,
    error: data.error,
  };
}

function mapBackendStore(b: { id?: string; name?: string; address?: string | null; distance_miles?: number | null }): Store {
  return {
    id: b.id || "",
    name: b.name || "Store",
    address: b.address ?? "",
    distance: typeof b.distance_miles === "number" ? b.distance_miles : 0,
    distanceUnit: "mi",
  };
}

/**
 * GET /api/stores — list of stores (from MARKETPLACE_STORES).
 */
export async function getStores(): Promise<Store[]> {
  const res = await fetch(`${BACKEND_URL}/api/stores`);
  if (!res.ok) throw new Error(`Stores failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data.map(mapBackendStore) : [];
}

/**
 * POST /api/marketplace/compare-prices — compare ingredient prices across stores.
 * Body: { zip: string, ingredients: string[] }.
 * Returns UI GroceryComparison[].
 */
export async function comparePrices(zip: string, ingredients: string[]): Promise<GroceryComparison[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180_000); // 3 min max (many ingredients = slow)
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/marketplace/compare-prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zip: zip.trim(), ingredients }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Price lookup timed out. Try fewer ingredients.");
    }
    throw e;
  }
  clearTimeout(timeoutId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || `Compare prices failed: ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data.map((row: {
    ingredient?: string;
    stores?: Array<{
      store?: unknown;
      price?: number;
      inStock?: boolean;
      isCheapest?: boolean;
      productName?: string | null;
      image?: string | null;
      linePriceDisplay?: string | null;
      unitPrice?: string | null;
    }>;
  }) => {
    const stores = (row.stores || []).map((s) => ({
      store: mapBackendStore((s.store || {}) as Parameters<typeof mapBackendStore>[0]),
      price: typeof s.price === "number" ? s.price : 0,
      inStock: s.inStock !== false,
      isCheapest: s.isCheapest === true,
      productName: s.productName ?? null,
      image: s.image ?? null,
      linePriceDisplay: s.linePriceDisplay ?? null,
      unitPrice: s.unitPrice ?? null,
    }));
    return { ingredient: row.ingredient || "", stores };
  });
}

// --- Auth (session or X-User-Id) ---

export interface AuthUser {
  user_id: string;
  name?: string;
  email?: string;
}

/** POST /api/auth/register — body: { name, email, password, profile? }. Returns user. Creates user + user_profiles. */
export async function register(payload: {
  name: string;
  email: string;
  password: string;
  profile?: Record<string, unknown>;
}): Promise<AuthUser> {
  const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || "Register failed");
  }
  return res.json();
}

/** POST /api/auth/login — body: { email, password } or { user_id? }. Returns { user_id }. */
export async function login(by: { email?: string; password?: string; user_id?: string }): Promise<{ user_id: string }> {
  const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(by),
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || "Login failed");
  }
  return res.json();
}

/** GET /api/user/profile — requires userId. Returns profile with zip, budget_weekly, diet, allergies, dislikes, max_prep_minutes, household_size, prefs. */
export interface UserProfile {
  id: string;
  zip: string;
  budget_weekly: number;
  diet: string;
  allergies: string[];
  dislikes: string[];
  max_prep_minutes: number;
  household_size: number;
  prefs: Record<string, unknown>;
  savedRecipes?: string[];
  madeRecipes?: unknown[];
  createdAt?: string;
  updatedAt?: string;
}

export async function getProfile(userId: string): Promise<UserProfile> {
  const res = await fetch(`${BACKEND_URL}/api/user/profile`, {
    headers: headers(userId),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Not logged in");
    throw new Error("Failed to load profile");
  }
  return res.json();
}

/** PUT /api/user/profile — requires userId. Body: { zip?, budget_weekly?, diet?, allergies?, dislikes?, max_prep_minutes?, household_size?, prefs? } */
export async function putProfile(
  userId: string,
  profile: Partial<Omit<UserProfile, "id" | "savedRecipes" | "madeRecipes" | "createdAt" | "updatedAt">>
): Promise<UserProfile> {
  const res = await fetch(`${BACKEND_URL}/api/user/profile`, {
    method: "PUT",
    headers: headers(userId),
    credentials: "include",
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Not logged in");
    throw new Error("Failed to save profile");
  }
  return res.json();
}

/** POST /api/auth/logout */
export async function logout(): Promise<void> {
  await fetch(`${BACKEND_URL}/api/auth/logout`, {
    method: "POST",
    headers: headers(),
    credentials: "include",
  });
}

/** GET /api/auth/me — returns current user or 401. */
export async function me(userId: string): Promise<AuthUser> {
  const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
    headers: headers(userId),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Not logged in");
  return res.json();
}

// --- Cart (requires X-User-Id) ---

function mapCartItem(r: {
  id?: string;
  ingredient?: string;
  storeId?: string;
  storeName?: string;
  price?: number;
  quantity?: number;
  unit?: string;
  recipeId?: string;
  recipeName?: string;
}): CartItem {
  return {
    id: String(r.id ?? ""),
    ingredient: r.ingredient ?? "",
    storeId: r.storeId ?? "",
    storeName: r.storeName ?? "",
    price: Number(r.price ?? 0),
    quantity: Number(r.quantity ?? 1),
    unit: r.unit ?? "item",
    recipeId: r.recipeId,
    recipeName: r.recipeName,
  };
}

/** GET /api/cart — requires userId (X-User-Id). */
export async function getCart(userId: string): Promise<{ items: CartItem[]; totalCost: number }> {
  const res = await fetch(`${BACKEND_URL}/api/cart`, { headers: headers(userId), credentials: "include" });
  if (!res.ok) throw new Error("Failed to load cart");
  const data = await res.json();
  const items = (data.items || []).map((r: Record<string, unknown>) =>
    mapCartItem({
      id: r.id as string | undefined,
      ingredient: r.ingredient as string | undefined,
      storeId: r.storeId as string | undefined,
      storeName: r.storeName as string | undefined,
      price: r.price as number | undefined,
      quantity: r.quantity as number | undefined,
      unit: r.unit as string | undefined,
      recipeId: r.recipeId as string | undefined,
      recipeName: r.recipeName as string | undefined,
    })
  );
  return { items, totalCost: Number(data.totalCost ?? 0) };
}

/** POST /api/cart/add — requires userId. Returns updated cart. */
export async function addToCart(
  userId: string,
  item: { ingredient: string; storeId: string; storeName: string; price: number; quantity?: number; unit?: string; recipeId?: string; recipeName?: string }
): Promise<{ items: CartItem[] }> {
  const res = await fetch(`${BACKEND_URL}/api/cart/add`, {
    method: "POST",
    headers: headers(userId),
    body: JSON.stringify({
      ingredient: item.ingredient,
      storeId: item.storeId,
      storeName: item.storeName,
      price: item.price,
      quantity: item.quantity ?? 1,
      unit: item.unit ?? "item",
      recipeId: item.recipeId,
      recipeName: item.recipeName,
    }),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to add to cart");
  const data = await res.json();
  return { items: (data.items || []).map((r: Record<string, unknown>) => mapCartItem(r)) };
}

/** POST /api/cart/update — body: { itemId, quantity }. Remove if quantity <= 0. */
export async function updateCartItem(userId: string, itemId: string, quantity: number): Promise<{ items: CartItem[] }> {
  const res = await fetch(`${BACKEND_URL}/api/cart/update`, {
    method: "POST",
    headers: headers(userId),
    body: JSON.stringify({ itemId, quantity }),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to update cart");
  const data = await res.json();
  return { items: (data.items || []).map((r: Record<string, unknown>) => mapCartItem(r)) };
}

/** DELETE /api/cart/<itemId> */
export async function removeFromCart(userId: string, itemId: string): Promise<{ items: CartItem[] }> {
  const res = await fetch(`${BACKEND_URL}/api/cart/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
    headers: headers(userId),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to remove from cart");
  const data = await res.json();
  return { items: (data.items || []).map((r: Record<string, unknown>) => mapCartItem(r)) };
}

// --- OpenAI Nutrition Estimation ---

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface MealSuggestion {
  id: string;
  name: string;
  description: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  prepTime: number;
  cookTime: number;
  servings: number;
  nutrition: NutritionInfo;
  ingredients: string[];
  instructions: string[];
  dietaryTags: string[];
}

/**
 * POST /api/nutrition/estimate — Get nutrition info for a meal using OpenAI.
 * Body: { meal_name: string, ingredients?: string[], serving_size?: string }
 */
export async function estimateNutrition(
  mealName: string,
  ingredients?: string[],
  servingSize?: string
): Promise<NutritionInfo> {
  const res = await fetch(`${BACKEND_URL}/api/nutrition/estimate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      meal_name: mealName,
      ingredients: ingredients || [],
      serving_size: servingSize || "1 serving",
    }),
  });
  if (!res.ok) {
    // Fallback to estimated values if API fails
    console.warn("Nutrition estimation failed, using defaults");
    return { calories: 400, protein: 20, carbs: 45, fat: 15, fiber: 5 };
  }
  const data = await res.json();
  return {
    calories: data.calories ?? 400,
    protein: data.protein ?? 20,
    carbs: data.carbs ?? 45,
    fat: data.fat ?? 15,
    fiber: data.fiber ?? 5,
  };
}

/**
 * POST /api/meals/generate — Generate personalized meal plan based on user preferences using OpenAI.
 * Body: { preferences: { dietary, allergies, goals, budget, cookingTime, householdSize, skillLevel } }
 */
export async function generateMealPlan(preferences: {
  dietary?: string[];
  allergies?: string[];
  dislikes?: string;
  goals?: string[];
  budget?: number;
  cookingTime?: number;
  householdSize?: number;
  skillLevel?: string;
}): Promise<MealSuggestion[]> {
  const res = await fetch(`${BACKEND_URL}/api/meals/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferences }),
  });
  if (!res.ok) {
    console.warn("Meal generation failed, using defaults");
    // Return default meals if API fails
    return getDefaultMeals();
  }
  const data = await res.json();
  return Array.isArray(data.meals) ? data.meals : getDefaultMeals();
}

/**
 * POST /api/recipes/extract — Generate a recipe from a dish description using OpenAI.
 * Body: { dish_name: string, restaurant_name?: string, notes?: string }
 */
export interface ExtractedRecipe {
  name: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  calories: number;
  ingredients: string[];
  instructions: string[];
}

export async function extractRecipe(
  dishName: string,
  restaurantName?: string,
  notes?: string
): Promise<ExtractedRecipe> {
  const res = await fetch(`${BACKEND_URL}/api/recipes/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dish_name: dishName,
      restaurant_name: restaurantName || "",
      notes: notes || "",
    }),
  });
  if (!res.ok) {
    throw new Error("Recipe extraction failed");
  }
  const data = await res.json();
  return data.recipe;
}

/** Default meals for fallback */
function getDefaultMeals(): MealSuggestion[] {
  return [
    {
      id: "default-1",
      name: "Overnight Oats with Berries",
      description: "Creamy overnight oats topped with fresh berries and honey",
      mealType: "breakfast",
      prepTime: 5,
      cookTime: 0,
      servings: 1,
      nutrition: { calories: 320, protein: 12, carbs: 52, fat: 8, fiber: 6 },
      ingredients: ["1/2 cup oats", "1/2 cup milk", "1/4 cup Greek yogurt", "1/2 cup mixed berries", "1 tbsp honey"],
      instructions: ["Mix oats, milk, and yogurt in a jar", "Refrigerate overnight", "Top with berries and honey"],
      dietaryTags: ["vegetarian"],
    },
    {
      id: "default-2",
      name: "Mediterranean Quinoa Bowl",
      description: "Fresh quinoa bowl with cucumber, tomatoes, feta, and lemon dressing",
      mealType: "lunch",
      prepTime: 15,
      cookTime: 15,
      servings: 2,
      nutrition: { calories: 420, protein: 14, carbs: 48, fat: 18, fiber: 8 },
      ingredients: ["1 cup quinoa", "1 cucumber diced", "1 cup cherry tomatoes", "1/2 cup feta cheese", "2 tbsp olive oil", "Juice of 1 lemon"],
      instructions: ["Cook quinoa and let cool", "Dice vegetables", "Mix all ingredients", "Dress with olive oil and lemon"],
      dietaryTags: ["vegetarian", "gluten-free"],
    },
    {
      id: "default-3",
      name: "Lemon Herb Chicken",
      description: "Juicy chicken breast with lemon, garlic, and fresh herbs",
      mealType: "dinner",
      prepTime: 10,
      cookTime: 25,
      servings: 4,
      nutrition: { calories: 380, protein: 42, carbs: 8, fat: 18, fiber: 2 },
      ingredients: ["4 chicken breasts", "2 lemons", "4 cloves garlic", "Fresh rosemary", "Fresh thyme", "2 tbsp olive oil"],
      instructions: ["Marinate chicken with lemon, garlic, and herbs", "Preheat oven to 400°F", "Bake for 25 minutes until cooked through"],
      dietaryTags: ["gluten-free", "dairy-free", "high-protein"],
    },
    {
      id: "default-4",
      name: "Vegetable Stir Fry",
      description: "Colorful vegetable stir fry with tofu and ginger-soy sauce",
      mealType: "dinner",
      prepTime: 15,
      cookTime: 10,
      servings: 3,
      nutrition: { calories: 290, protein: 16, carbs: 28, fat: 14, fiber: 6 },
      ingredients: ["1 block firm tofu", "2 cups mixed vegetables", "2 tbsp soy sauce", "1 tbsp sesame oil", "1 inch ginger minced"],
      instructions: ["Press and cube tofu", "Stir fry vegetables", "Add tofu and sauce", "Serve over rice"],
      dietaryTags: ["vegetarian", "vegan", "dairy-free"],
    },
    {
      id: "default-5",
      name: "Greek Yogurt Parfait",
      description: "Layered Greek yogurt with granola and fresh fruit",
      mealType: "breakfast",
      prepTime: 5,
      cookTime: 0,
      servings: 1,
      nutrition: { calories: 280, protein: 18, carbs: 38, fat: 6, fiber: 4 },
      ingredients: ["1 cup Greek yogurt", "1/4 cup granola", "1/2 cup mixed berries", "1 tbsp honey"],
      instructions: ["Layer yogurt, granola, and berries in a glass", "Drizzle with honey", "Enjoy immediately"],
      dietaryTags: ["vegetarian"],
    },
    {
      id: "default-6",
      name: "Black Bean Tacos",
      description: "Hearty black bean tacos with avocado and fresh salsa",
      mealType: "dinner",
      prepTime: 10,
      cookTime: 10,
      servings: 4,
      nutrition: { calories: 340, protein: 12, carbs: 48, fat: 14, fiber: 14 },
      ingredients: ["2 cans black beans", "8 corn tortillas", "2 avocados", "1 cup salsa", "1/4 cup cilantro", "2 limes"],
      instructions: ["Heat and season black beans", "Warm tortillas", "Assemble tacos with beans, avocado, salsa, and cilantro"],
      dietaryTags: ["vegetarian", "vegan", "dairy-free"],
    },
    {
      id: "default-7",
      name: "Spinach Salad with Salmon",
      description: "Fresh spinach salad topped with grilled salmon and balsamic vinaigrette",
      mealType: "lunch",
      prepTime: 10,
      cookTime: 12,
      servings: 2,
      nutrition: { calories: 450, protein: 38, carbs: 12, fat: 28, fiber: 4 },
      ingredients: ["2 salmon fillets", "4 cups baby spinach", "1/4 cup walnuts", "2 tbsp balsamic vinegar", "2 tbsp olive oil"],
      instructions: ["Grill salmon until cooked through", "Arrange spinach and top with salmon", "Drizzle with balsamic vinaigrette"],
      dietaryTags: ["gluten-free", "dairy-free", "high-protein"],
    },
  ];
}
