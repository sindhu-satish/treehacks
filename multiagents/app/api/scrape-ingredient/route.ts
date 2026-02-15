/**
 * Scrape ingredient/grocery info using Bright Data Datasets API (direct HTTP).
 * Called by backend when MARKETPLACE_PROVIDER=brightdata and SCRAPER_SERVICE_URL points here.
 *
 * Supports Walmart and Target only; each store uses its own dataset and input shape.
 */
import { NextResponse } from "next/server";

const API_KEY = process.env.BRIGHTDATA_API_KEY;

const WALMART_DATASET_ID = "gd_l95fol7l1ru6rlo116";
const TARGET_DATASET_ID = "gd_ltppk5mx2lp0v1k0vo";

type StoreConfig = {
  datasetId: string;
  discoverBy: string;
  buildInput: (query: string, zipCode: string) => Record<string, string>;
  extraParams?: Record<string, string>;
};

const STORE_CONFIGS: Record<string, StoreConfig> = {
  walmart: {
    datasetId: WALMART_DATASET_ID,
    discoverBy: "keyword",
    buildInput: (query) => ({
      keyword: query,
      domain: "https://www.walmart.com/",
    }),
    extraParams: { limit_per_input: "5" },
  },
  target: {
    datasetId: TARGET_DATASET_ID,
    discoverBy: "keywords",
    buildInput: (query, zipCode) => ({
      keywords: query,
      zipcode: zipCode || "",
    }),
  },
};

function extractPrice(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const match = value.replace(/[$,]/g, "").match(/\d+(?:\.\d{2})?/);
    if (match) {
      const n = parseFloat(match[0]);
      return Number.isNaN(n) ? null : n;
    }
  }
  return null;
}

function pickFirstResult(data: unknown): {
  name?: string;
  price?: number;
  url?: string;
  image?: string | null;
} | null {
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0] as Record<string, unknown>;
    const name =
      (first.title as string) ??
      (first.name as string) ??
      (first.product_name as string);
    const price =
      extractPrice(first.price) ??
      extractPrice(first.current_price) ??
      extractPrice(first.final_price);
    const url =
      (first.url as string) ??
      (first.link as string) ??
      (first.product_url as string);
    const image = (first.image as string) ?? (first.image_url as string) ?? null;
    return { name, price: price ?? undefined, url, image };
  }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    const name =
      (obj.title as string) ?? (obj.name as string) ?? (obj.product_name as string);
    const price =
      extractPrice(obj.price) ??
      extractPrice(obj.current_price) ??
      extractPrice(obj.final_price);
    const url =
      (obj.url as string) ?? (obj.link as string) ?? (obj.product_url as string);
    const image = (obj.image as string) ?? (obj.image_url as string) ?? null;
    return { name, price: price ?? undefined, url, image };
  }
  return null;
}

export async function POST(req: Request) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "BRIGHTDATA_API_KEY not configured" },
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

  const config = STORE_CONFIGS[store];
  const url = new URL("https://api.brightdata.com/datasets/v3/scrape");
  url.searchParams.set("dataset_id", config.datasetId);
  url.searchParams.set("notify", "false");
  url.searchParams.set("include_errors", "true");
  url.searchParams.set("type", "discover_new");
  url.searchParams.set("discover_by", config.discoverBy);
  if (config.extraParams) {
    for (const [k, v] of Object.entries(config.extraParams)) {
      url.searchParams.set(k, v);
    }
  }

  const inputItem = config.buildInput(query, zipCode);

  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: [inputItem],
      }),
    });

    const raw = await res.text();
    let data: unknown;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      return NextResponse.json(
        { error: "Scrape failed", details: raw.slice(0, 200) },
        { status: 500 }
      );
    }

    if (!res.ok) {
      const errMsg =
        (data as { error?: string })?.error ?? res.statusText ?? "Scrape failed";
      return NextResponse.json(
        { error: errMsg, details: data },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    // 202 = async job; we don't poll here
    if (res.status === 202) {
      const snapshotId = (data as { snapshot_id?: string })?.snapshot_id;
      return NextResponse.json({
        name: `${query} (${store})`,
        price: undefined,
        currency: "USD",
        availability: "unknown",
        url: null,
        image: null,
        error: snapshotId
          ? "Scrape queued (async); use snapshot_id to poll for results"
          : "Scrape queued (async)",
      });
    }

    const first = pickFirstResult(data);
    if (!first) {
      return NextResponse.json({
        name: query,
        price: undefined,
        currency: "USD",
        availability: "unknown",
        url: null,
        image: null,
      });
    }

    return NextResponse.json({
      name: first.name ?? query,
      price: first.price,
      currency: "USD",
      availability: first.price != null ? "in_stock" : "unknown",
      url: first.url ?? null,
      image: first.image ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Scrape failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
