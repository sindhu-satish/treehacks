/**
 * Scrape ingredient/grocery info using Bright Data Datasets API (trigger + poll + download).
 * Called by backend when MARKETPLACE_PROVIDER=brightdata and SCRAPER_SERVICE_URL points here.
 *
 * Uses POST /datasets/v3/trigger with type=discover_new. Auth: Bearer BRIGHTDATA_API_KEY.
 * Supports Walmart and Target only.
 */
import { NextResponse } from "next/server";

const API_KEY = process.env.BRIGHTDATA_API_KEY;

const WALMART_DATASET_ID = "gd_l95fol7l1ru6rlo116";
const TARGET_DATASET_ID = "gd_ltppk5mx2lp0v1k0vo";

const TRIGGER_URL = "https://api.brightdata.com/datasets/v3/trigger";
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 90_000;

const LOG = (msg: string, data?: unknown) => {
  const suffix = data === undefined ? "" : ` ${JSON.stringify(data)}`;
  console.log(`[scrape-ingredient] ${msg}${suffix}`);
};

type StoreConfig = {
  datasetId: string;
  discoverBy: string;
  buildInput: (query: string, zipCode: string) => Record<string, string | boolean>;
  extraParams?: Record<string, string>;
};

const STORE_CONFIGS: Record<string, StoreConfig> = {
  walmart: {
    datasetId: WALMART_DATASET_ID,
    discoverBy: "keyword",
    buildInput: (query) => ({
      keyword: query,
      domain: "https://www.walmart.com/",
      all_variations: false,
    }),
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

async function pollUntilReady(snapshotId: string): Promise<"ready" | "failed"> {
  const progressUrl = `https://api.brightdata.com/datasets/v3/progress/${snapshotId}`;
  const started = Date.now();
  let pollCount = 0;
  while (Date.now() - started < POLL_TIMEOUT_MS) {
    pollCount += 1;
    const res = await fetch(progressUrl, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    const body = (await res.json()) as { status?: string };
    const status = body.status ?? "";
    console.log(`[scrape-ingredient] progress poll #${pollCount} GET ${progressUrl} -> ${res.status}`, JSON.stringify(body));
    if (!res.ok) {
      throw new Error(`Progress check failed: ${res.status}`);
    }
    if (status === "ready") return "ready";
    if (status === "failed") return "failed";
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error("Snapshot polling timeout");
}

async function downloadSnapshot(snapshotId: string): Promise<unknown> {
  const url = `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  const data = await res.json();
  const summary = Array.isArray(data)
    ? { type: "array", length: data.length, firstKeys: data[0] ? Object.keys(data[0] as object) : [] }
    : { type: "object", keys: Object.keys(data as object) };
  console.log(`[scrape-ingredient] snapshot download GET ${url} -> ${res.status}`, JSON.stringify(summary));
  if (res.status === 409) {
    throw new Error("Snapshot not ready for download");
  }
  if (!res.ok) {
    throw new Error(`Snapshot download failed: ${res.status}`);
  }
  return data;
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
  const params = new URLSearchParams({
    dataset_id: config.datasetId,
    include_errors: "true",
    type: "discover_new",
    discover_by: config.discoverBy,
    limit_multiple_results: "1",
  });
  if (config.extraParams) {
    for (const [k, v] of Object.entries(config.extraParams)) {
      params.set(k, v);
    }
  }
  const triggerTarget = `${TRIGGER_URL}?${params.toString()}`;
  const inputItem = config.buildInput(query, zipCode);
  const requestBody = [inputItem];

  LOG("request", { store, query, zipCode, url: triggerTarget, body: requestBody });

  try {
    const triggerRes = await fetch(triggerTarget, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const raw = await triggerRes.text();
    let triggerData: unknown;
    try {
      triggerData = raw ? JSON.parse(raw) : null;
    } catch {
      return NextResponse.json(
        { error: "Trigger failed", details: raw.slice(0, 200) },
        { status: 500 }
      );
    }

    LOG("trigger response", { status: triggerRes.status, body: triggerData });

    if (!triggerRes.ok) {
      const errMsg =
        (triggerData as { error?: string })?.error ?? triggerRes.statusText ?? "Trigger failed";
      return NextResponse.json(
        { error: errMsg, details: triggerData },
        { status: triggerRes.status >= 500 ? 502 : triggerRes.status }
      );
    }

    const snapshotId = (triggerData as { snapshot_id?: string })?.snapshot_id;
    if (!snapshotId) {
      return NextResponse.json(
        { error: "No snapshot_id in trigger response", details: triggerData },
        { status: 502 }
      );
    }

    const status = await pollUntilReady(snapshotId);
    LOG("poll finished", { snapshotId, status });
    if (status === "failed") {
      return NextResponse.json({
        name: query,
        price: undefined,
        currency: "USD",
        availability: "unknown",
        url: null,
        image: null,
      });
    }

    const snapshotData = await downloadSnapshot(snapshotId);
    const first = pickFirstResult(snapshotData);
    LOG("parsed first result", first ?? "none");
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
