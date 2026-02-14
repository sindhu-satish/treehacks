"use client";

import { Store } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StoreCardProps {
  store: Store;
  items: {
    name: string;
    price: number;
    inStock: boolean;
    isCheapest: boolean;
  }[];
  totalPrice: number;
}

export function StoreCard({ store, items, totalPrice }: StoreCardProps) {
  const cheapestCount = items.filter((i) => i.isCheapest).length;

  return (
    <Card className="p-4 hover:shadow-lg transition-all border-border/50">
      {/* Store Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-charcoal">{store.name}</h3>
          <p className="text-sm text-muted-foreground">
            {store.distance} {store.distanceUnit} away
          </p>
        </div>
        {cheapestCount > 0 && (
          <Badge className="bg-lime/20 text-charcoal border-0">
            {cheapestCount} best price{cheapestCount > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Items */}
      <div className="space-y-2 mb-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between text-sm py-1.5 border-b border-border/30 last:border-0"
          >
            <span className={!item.inStock ? "text-muted-foreground line-through" : ""}>
              {item.name}
            </span>
            <div className="flex items-center gap-2">
              {item.isCheapest && (
                <span className="text-xs text-lime font-medium">Best</span>
              )}
              <span
                className={`font-medium ${
                  item.isCheapest ? "text-lime" : "text-charcoal"
                }`}
              >
                ${item.price.toFixed(2)}
              </span>
              {!item.inStock && (
                <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
                  Out
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="font-medium text-muted-foreground">Estimated total</span>
        <span className="text-lg font-bold text-charcoal">${totalPrice.toFixed(2)}</span>
      </div>
    </Card>
  );
}
