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
  const res = await fetch(`${BACKEND_URL}/api/marketplace/compare-prices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ zip: zip.trim(), ingredients }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || `Compare prices failed: ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data.map((row: { ingredient?: string; stores?: Array<{ store?: unknown; price?: number; inStock?: boolean; isCheapest?: boolean }> }) => {
    const stores = (row.stores || []).map((s: { store?: unknown; price?: number; inStock?: boolean; isCheapest?: boolean }) => ({
      store: mapBackendStore((s.store || {}) as Parameters<typeof mapBackendStore>[0]),
      price: typeof s.price === "number" ? s.price : 0,
      inStock: s.inStock !== false,
      isCheapest: s.isCheapest === true,
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
      id: r.id,
      ingredient: r.ingredient,
      storeId: r.storeId,
      storeName: r.storeName,
      price: r.price,
      quantity: r.quantity,
      unit: r.unit,
      recipeId: r.recipeId,
      recipeName: r.recipeName,
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
