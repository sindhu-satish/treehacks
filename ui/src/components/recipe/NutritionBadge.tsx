"use client";

import { NutritionInfo } from "@/types";

interface NutritionBadgeProps {
  nutrition: NutritionInfo;
  compact?: boolean;
}

export function NutritionBadge({ nutrition, compact }: NutritionBadgeProps) {
  const items = [
    { label: "Cal", value: nutrition.calories, color: "bg-coral/20 text-coral" },
    { label: "Protein", value: `${nutrition.protein}g`, color: "bg-lime/20 text-lime" },
    { label: "Carbs", value: `${nutrition.carbs}g`, color: "bg-sunny/30 text-charcoal" },
    { label: "Fat", value: `${nutrition.fat}g`, color: "bg-pink/20 text-pink" },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold text-coral">{nutrition.calories} cal</span>
        <span className="text-muted-foreground">|</span>
        <span className="text-muted-foreground">{nutrition.protein}g protein</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
      {items.map((item) => (
        <div
          key={item.label}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium ${item.color}`}
        >
          {item.value} {item.label !== "Cal" && item.label.toLowerCase()}
          {item.label === "Cal" && " cal"}
        </div>
      ))}
      {nutrition.fiber && (
        <div className="px-2.5 py-1 rounded-lg text-xs font-medium bg-accent/20 text-charcoal">
          {nutrition.fiber}g fiber
        </div>
      )}
    </div>
  );
}
