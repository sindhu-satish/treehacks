"use client";

import { Recipe } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NutritionBadge } from "./NutritionBadge";

interface RecipeCardProps {
  recipe: Recipe;
  onSelect?: () => void;
  compact?: boolean;
}

export function RecipeCard({ recipe, onSelect, compact }: RecipeCardProps) {
  return (
    <Card
      className={`overflow-hidden hover:shadow-lg transition-all cursor-pointer border-border/50 ${
        compact ? "p-3" : "p-4"
      }`}
      onClick={onSelect}
    >
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className={`font-bold text-charcoal ${compact ? "text-base" : "text-lg"}`}>
              {recipe.name}
            </h3>
            {!compact && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {recipe.description}
              </p>
            )}
          </div>
          <Badge variant="secondary" className="shrink-0 bg-lime/20 text-charcoal border-0">
            {recipe.difficulty}
          </Badge>
        </div>

        {/* Time & Servings */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <span>⏱️</span>
            {recipe.prepTime + recipe.cookTime} min
          </span>
          <span className="flex items-center gap-1">
            <span>👥</span>
            {recipe.servings} servings
          </span>
          <span className="flex items-center gap-1">
            <span>🍽️</span>
            {recipe.cuisine}
          </span>
        </div>

        {/* Dietary Tags */}
        <div className="flex flex-wrap gap-1.5">
          {recipe.dietaryTags.slice(0, compact ? 3 : 5).map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-xs bg-coral-light/30 text-charcoal border-coral/20"
            >
              {tag}
            </Badge>
          ))}
        </div>

        {/* Nutrition */}
        {!compact && <NutritionBadge nutrition={recipe.nutrition} />}
      </div>
    </Card>
  );
}
