"use client";

import { MealPlan } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NutritionBadge } from "@/components/recipe/NutritionBadge";

interface MealCalendarProps {
  mealPlan: MealPlan;
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MealCalendar({ mealPlan }: MealCalendarProps) {
  return (
    <div className="bg-white rounded-2xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-cream/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-charcoal flex items-center gap-2">
              <span>📅</span> Your Weekly Meal Plan
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              7 days of delicious, balanced meals
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-coral">${mealPlan.totalCost}</div>
            <div className="text-xs text-muted-foreground">estimated total</div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-border/50">
            {mealPlan.days.map((day, idx) => {
              const date = new Date(day.date);
              const isToday = new Date().toDateString() === date.toDateString();
              return (
                <div
                  key={idx}
                  className={`p-3 text-center border-r border-border/30 last:border-r-0 ${
                    isToday ? "bg-coral/10" : ""
                  }`}
                >
                  <div className={`text-xs font-medium ${isToday ? "text-coral" : "text-muted-foreground"}`}>
                    {dayNames[date.getDay()]}
                  </div>
                  <div className={`text-lg font-bold ${isToday ? "text-coral" : "text-charcoal"}`}>
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Meal Rows */}
          {["breakfast", "lunch", "dinner"].map((mealType) => (
            <div key={mealType} className="grid grid-cols-7 border-b border-border/30 last:border-b-0">
              {mealPlan.days.map((day, idx) => {
                const meal = day.meals[mealType as keyof typeof day.meals];
                const isArray = Array.isArray(meal);
                const mealData = isArray ? null : meal;

                return (
                  <div
                    key={idx}
                    className="p-2 border-r border-border/30 last:border-r-0 min-h-[100px]"
                  >
                    {/* Meal Type Label (only on first column) */}
                    {idx === 0 && (
                      <Badge
                        variant="outline"
                        className="mb-2 text-xs capitalize bg-sunny/20 border-sunny/30"
                      >
                        {mealType}
                      </Badge>
                    )}

                    {mealData && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-charcoal line-clamp-2">
                          {mealData.recipe.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {mealData.recipe.nutrition.calories} cal
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Daily Nutrition Summary */}
          <div className="grid grid-cols-7 bg-muted/30">
            {mealPlan.days.map((day, idx) => (
              <div key={idx} className="p-2 border-r border-border/30 last:border-r-0">
                <div className="text-xs text-muted-foreground mb-1">Daily total</div>
                <div className="text-sm font-bold text-coral">
                  {day.dailyNutrition.calories} cal
                </div>
                <div className="text-xs text-muted-foreground">
                  {day.dailyNutrition.protein}g protein
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
