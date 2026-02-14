"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GroceryListProps {
  items: {
    name: string;
    amount: string;
    category: string;
    estimatedPrice?: number;
  }[];
  totalCost: number;
}

const categoryIcons: Record<string, string> = {
  produce: "🥬",
  protein: "🥜",
  dairy: "🥛",
  grains: "🌾",
  canned: "🥫",
  spices: "🧂",
  other: "📦",
};

export function GroceryList({ items, totalCost }: GroceryListProps) {
  // Group by category
  const grouped = items.reduce((acc, item) => {
    const cat = item.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  return (
    <Card className="p-4 border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-charcoal flex items-center gap-2">
          <span>🛍️</span> Grocery List
        </h3>
        <Badge className="bg-coral text-white">
          {items.length} items • ~${totalCost}
        </Badge>
      </div>

      <div className="space-y-4">
        {Object.entries(grouped).map(([category, categoryItems]) => (
          <div key={category}>
            <div className="flex items-center gap-2 mb-2">
              <span>{categoryIcons[category] || "📦"}</span>
              <span className="text-sm font-medium text-muted-foreground capitalize">
                {category}
              </span>
            </div>
            <div className="space-y-1 pl-6">
              {categoryItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm py-1"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-border accent-coral"
                    />
                    <span>{item.name}</span>
                    <span className="text-muted-foreground">({item.amount})</span>
                  </div>
                  {item.estimatedPrice && (
                    <span className="text-muted-foreground">
                      ~${item.estimatedPrice.toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
