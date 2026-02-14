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
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`font-bold text-charcoal ${compact ? "text-base" : "text-lg"} truncate`}>
                {recipe.name}
              </h3>
              {recipe.isSaved && (
                <span className="text-coral shrink-0">♥</span>
              )}
              {recipe.madeCount && recipe.madeCount > 0 && (
                <Badge className="shrink-0 bg-lime/20 text-charcoal border-0 text-xs">
                  Made {recipe.madeCount}x
                </Badge>
              )}
            </div>
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

        {/* Price & Time Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <span>⏱️</span>
              {recipe.prepTime + recipe.cookTime} min
            </span>
            <span className="flex items-center gap-1">
              <span>👥</span>
              {recipe.servings} servings
            </span>
            {!compact && (
              <span className="flex items-center gap-1">
                <span>🍽️</span>
                {recipe.cuisine}
              </span>
            )}
          </div>

          {/* Pricing */}
          {recipe.estimatedCost && (
            <div className="text-right shrink-0">
              <div className="font-bold text-coral">${recipe.estimatedCost.toFixed(2)}</div>
              {recipe.cheapestStore && (
                <div className="text-xs text-lime">{recipe.cheapestStore}</div>
              )}
            </div>
          )}
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
