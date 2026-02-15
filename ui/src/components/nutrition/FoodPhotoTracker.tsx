"use client";

import { useEffect, useState } from "react";

export type FoodPhotoResult =
  | { ok: true; dish_name: string; calories_estimate: number; confidence: "low" | "medium" | "high"; notes: string }
  | { ok: false; error: string; raw?: string };

export default function FoodPhotoTracker(props: {
  file: File | null;
  runSignal: number;               // bump this to trigger analysis
  onResult?: (r: FoodPhotoResult) => void;
}) {
  const { file, runSignal, onResult } = props;

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FoodPhotoResult | null>(null);

  useEffect(() => {
    async function run() {
      if (!file) return;
      setLoading(true);
      setResult(null);

      try {
        const form = new FormData();
        form.append("image", file);

        const res = await fetch("/api/food-photo", { method: "POST", body: form });
        const raw = await res.text();

        let data: FoodPhotoResult;
        try {
        data = JSON.parse(raw) as FoodPhotoResult;
        } catch {
        data = { ok: false, error: "Non-JSON response from /api/food-photo", raw } as any;
        }
        setResult(data);
        onResult?.(data);
      } catch (e: any) {
        const err = { ok: false as const, error: e?.message || "Request failed" };
        setResult(err);
        onResult?.(err);
      } finally {
        setLoading(false);
      }
    }

    // only run when parent “signals” it
    if (runSignal > 0) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSignal]);

  if (!file) return null;

  return (
    <div className="rounded-xl bg-muted/20 p-3 text-sm border border-border/50">
      {loading ? (
        <div className="flex items-center gap-2">
          <span className="animate-spin">⏳</span>
          <span>Analyzing photo…</span>
        </div>
      ) : result ? (
        "ok" in result && result.ok ? (
          <>
            <div><span className="font-medium">Dish:</span> {result.dish_name}</div>
            <div><span className="font-medium">Calories (est.):</span> {result.calories_estimate} kcal</div>
            <div><span className="font-medium">Confidence:</span> {result.confidence}</div>
            <div className="mt-2 text-muted-foreground">{result.notes}</div>
          </>
        ) : (
          <>
            <div className="text-red-600 font-medium">Error: {result.error}</div>
            {"raw" in result && result.raw ? (
              <pre className="mt-2 whitespace-pre-wrap">{result.raw}</pre>
            ) : null}
          </>
        )
      ) : (
        <div className="text-muted-foreground">Ready to analyze.</div>
      )}
    </div>
  );
}
