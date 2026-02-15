/**
 * Proxy to backend marketplace. Maps to agent-friendly store list shape.
 */
import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

type BackendItem = {
  ingredient?: string;
  matched_item?: { name?: string; price?: number };
};

type BackendResponse = {
  store?: { name?: string; distance_miles?: number | null };
  items?: BackendItem[];
  meta?: { zip?: string };
  error?: string;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const zip = searchParams.get("zip") || "";
    const ingredientsParam = searchParams.get("ingredients");
    let ingredients: string[] = [];
    try {
      const parsed = ingredientsParam ? JSON.parse(ingredientsParam) : [];
      ingredients = Array.isArray(parsed) ? parsed : [String(parsed)];
    } catch {
      ingredients = ingredientsParam ? ingredientsParam.split(",").map((s) => s.trim()) : [];
    }

    if (!zip) {
      return NextResponse.json(
        { error: "zip_required", message: "zip is required" },
        { status: 400 }
      );
    }
    if (ingredients.length === 0) {
      return NextResponse.json(
        { error: "ingredients_required", message: "ingredients must be non-empty" },
        { status: 400 }
      );
    }

    const res = await fetch(`${BACKEND_URL}/api/marketplace`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zip, ingredients }),
      signal: AbortSignal.timeout(12000),
    });

    const data = (await res.json()) as BackendResponse;

    if (!res.ok || data.error) {
      return NextResponse.json(
        { error: data.error ?? "Marketplace failed", message: (data as { message?: string }).message },
        { status: res.ok ? 400 : res.status }
      );
    }

    // Map backend response to agent-friendly store list format
    const items = data.items ?? [];
    const storeName = data.store?.name ?? "Store";
    const distanceMi = data.store?.distance_miles ?? null;
    const ingredientNames = items.map((i) => i.ingredient ?? "").filter(Boolean);
    const totalEstimate = items.reduce((sum, i) => {
      const p = i.matched_item?.price;
      return sum + (typeof p === "number" ? p : 0);
    }, 0);

    const stores = [
      {
        name: storeName,
        distance_mi: distanceMi,
        items: ingredientNames,
        total_estimate: Math.round(totalEstimate * 100) / 100,
        zip: data.meta?.zip ?? zip,
        raw_items: items.map((i) => ({
          ingredient: i.ingredient,
          matched: i.matched_item,
        })),
      },
    ];

    return NextResponse.json(stores);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
