"use client";

import { GroceryComparison as GroceryComparisonType } from "@/types";
import { Badge } from "@/components/ui/badge";

interface GroceryComparisonProps {
  comparisons: GroceryComparisonType[];
}

export function GroceryComparison({ comparisons }: GroceryComparisonProps) {
  return (
    <div className="bg-white rounded-2xl border border-border/50 overflow-hidden">
      <div className="p-4 border-b border-border/50 bg-cream/50">
        <h3 className="font-bold text-charcoal flex items-center gap-2">
          <span>🛒</span> Price Comparison
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Showing prices from stores near you
        </p>
      </div>

      <div className="divide-y divide-border/30">
        {comparisons.map((comparison, idx) => (
          <div key={idx} className="p-4">
            <div className="font-medium text-charcoal mb-2">{comparison.ingredient}</div>
            <div className="flex flex-wrap gap-2">
              {comparison.stores.map((storePrice, sIdx) => (
                <div
                  key={sIdx}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                    storePrice.isCheapest
                      ? "bg-lime/20 border border-lime/30"
                      : "bg-muted/50"
                  } ${!storePrice.inStock ? "opacity-50" : ""}`}
                >
                  <span className="font-medium">{storePrice.store.name}</span>
                  <span
                    className={`font-bold ${
                      storePrice.isCheapest ? "text-lime" : "text-charcoal"
                    }`}
                  >
                    ${storePrice.price.toFixed(2)}
                  </span>
                  {storePrice.isCheapest && (
                    <Badge className="bg-lime text-white text-xs px-1.5 py-0">
                      Best
                    </Badge>
                  )}
                  {!storePrice.inStock && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Out
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
