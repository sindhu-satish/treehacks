/**
 * Scrape ingredient/grocery info using backend unlocker + extract_top_instore_items.
 * Same flow as GET /api/unlocker/test: fetch HTML via Bright Data Web Unlocker,
 * parse __NEXT_DATA__ with extract_top_instore_items, return items array.
 *
 * Proxies to backend (BACKEND_URL) which must have BRIGHTDATA_CUSTOMER/ZONE/PASSWORD configured.
 */
import { NextResponse } from "next/server";

const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");

const LOG = (msg: string, data?: unknown) => {
  const suffix = data === undefined ? "" : ` ${JSON.stringify(data)}`;
  console.log(`[scrape-ingredient] ${msg}${suffix}`);
};

function buildSearchUrl(store: string, query: string, _zip: string): string | null {
  const q = encodeURIComponent(query);
  const s = store.toLowerCase();
  if (s === "walmart" || s === "wm") {
    return `https://www.walmart.com/search?q=${q}`;
  }
  if (s === "target" || s === "tgt") {
    return `https://www.target.com/s?searchTerm=${q}`;
  }
  return null;
}

export async function POST(req: Request) {
  const backendUrl = BACKEND_URL;
  if (!backendUrl) {
    return NextResponse.json(
      { error: "BACKEND_URL not configured" },
      { status: 503 }
    );
  }

  let body: { store?: string; zip?: string; query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const storeRaw = (body.store || "walmart").toLowerCase();
  const store = storeRaw === "target" ? "target" : "walmart";
  const query = (body.query || "").trim();
  const zipCode = (body.zip || "").trim();

  if (!query) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  const searchUrl = buildSearchUrl(store, query, zipCode);
  if (!searchUrl) {
    return NextResponse.json({ error: "Unsupported store" }, { status: 400 });
  }

  const unlockerUrl = `${backendUrl}/api/unlocker/test?url=${encodeURIComponent(searchUrl)}`;
  LOG("request", { store, query, zipCode, unlockerUrl });

  try {
    const res = await fetch(unlockerUrl, { method: "GET" });
    const data = (await res.json()) as {
      ok?: boolean;
      items?: unknown[];
      error?: string;
    };

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || "Unlocker request failed" },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    const items = Array.isArray(data.items) ? data.items : [];
    LOG("response", { itemCount: items.length });
    return NextResponse.json(items);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Scrape failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
