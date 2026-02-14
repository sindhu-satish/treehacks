"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface NutritionDashboardProps {
  todayCalories: number;
  todayProtein: number;
  todayCarbs: number;
  todayFat: number;
  todayFiber: number;
  targetCalories: number;
  targetProtein: number;
  weeklyAvg: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  mealsLogged: number;
  streak: number;
  goals: string[];
}

export function NutritionDashboard({
  todayCalories,
  todayProtein,
  todayCarbs,
  todayFat,
  todayFiber,
  targetCalories,
  targetProtein,
  weeklyAvg,
  mealsLogged,
  streak,
  goals,
}: NutritionDashboardProps) {
  const caloriePercent = Math.min(100, (todayCalories / targetCalories) * 100);
  const proteinPercent = Math.min(100, (todayProtein / targetProtein) * 100);

  const getCalorieStatus = () => {
    const diff = todayCalories - targetCalories;
    if (Math.abs(diff) < 100) return { status: "perfect", message: "Right on target!", color: "lime" };
    if (diff < 0) return { status: "under", message: `${Math.abs(diff)} cal remaining`, color: "sunny" };
    return { status: "over", message: `${diff} cal over target`, color: "coral" };
  };

  const calorieStatus = getCalorieStatus();

  return (
    <div className="space-y-4">
      {/* Main Stats Card */}
      <Card className="p-6 border-2 border-lime/30 shadow-playful-lime overflow-hidden relative">
        {/* Decorative gradient */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-lime/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-xl text-charcoal">Today&apos;s Nutrition</h3>
              <p className="text-sm text-muted-foreground">{mealsLogged} meals logged</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-sunny/20 text-charcoal border-0 font-bold">
                {streak} day streak 🔥
              </Badge>
            </div>
          </div>

          {/* Main calorie ring */}
          <div className="flex items-center gap-6 mb-6">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#f0f0f0"
                  strokeWidth="12"
                />
                {/* Progress ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={calorieStatus.color === "lime" ? "#69F0AE" : calorieStatus.color === "sunny" ? "#FFD740" : "#FF5252"}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${caloriePercent * 2.64} 264`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-display font-bold text-2xl text-charcoal">{todayCalories}</div>
                <div className="text-xs text-muted-foreground">of {targetCalories}</div>
              </div>
            </div>

            <div className="flex-1">
              <div className={`text-lg font-bold text-${calorieStatus.color} mb-1`}>
                {calorieStatus.message}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {goals.includes("weight-loss") && todayCalories < targetCalories && "Great job staying under your goal!"}
                {goals.includes("weight-loss") && todayCalories > targetCalories && "Try to cut back on dinner"}
                {goals.includes("muscle") && "Make sure to hit your protein target!"}
              </p>

              {/* Quick macro overview */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <div className="font-bold text-charcoal">{todayProtein}g</div>
                  <div className="text-xs text-muted-foreground">Protein</div>
                </div>
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <div className="font-bold text-charcoal">{todayCarbs}g</div>
                  <div className="text-xs text-muted-foreground">Carbs</div>
                </div>
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <div className="font-bold text-charcoal">{todayFat}g</div>
                  <div className="text-xs text-muted-foreground">Fat</div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Macros */}
          <div className="space-y-3">
            {/* Protein */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-charcoal flex items-center gap-2">
                  <span>💪</span> Protein
                </span>
                <span className="text-sm">
                  <span className="font-bold text-lime">{todayProtein}g</span>
                  <span className="text-muted-foreground"> / {targetProtein}g</span>
                </span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full gradient-lime transition-all"
                  style={{ width: `${proteinPercent}%` }}
                />
              </div>
            </div>

            {/* Carbs */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-charcoal flex items-center gap-2">
                  <span>🍞</span> Carbs
                </span>
                <span className="text-sm">
                  <span className="font-bold text-sunny">{todayCarbs}g</span>
                  <span className="text-muted-foreground"> / 250g</span>
                </span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full gradient-sunny transition-all"
                  style={{ width: `${Math.min(100, (todayCarbs / 250) * 100)}%` }}
                />
              </div>
            </div>

            {/* Fat */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-charcoal flex items-center gap-2">
                  <span>🥑</span> Fat
                </span>
                <span className="text-sm">
                  <span className="font-bold text-pink">{todayFat}g</span>
                  <span className="text-muted-foreground"> / 65g</span>
                </span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full bg-pink transition-all"
                  style={{ width: `${Math.min(100, (todayFat / 65) * 100)}%` }}
                />
              </div>
            </div>

            {/* Fiber */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-charcoal flex items-center gap-2">
                  <span>🥦</span> Fiber
                </span>
                <span className="text-sm">
                  <span className="font-bold text-lime">{todayFiber}g</span>
                  <span className="text-muted-foreground"> / 30g</span>
                </span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full bg-lime transition-all"
                  style={{ width: `${Math.min(100, (todayFiber / 30) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Weekly Overview */}
      <Card className="p-4 border-2 border-purple/20">
        <h3 className="font-display font-bold text-charcoal mb-3 flex items-center gap-2">
          <span>📊</span> Weekly Average
        </h3>
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-3 bg-coral/10 rounded-xl">
            <div className="font-bold text-coral text-lg">{weeklyAvg.calories}</div>
            <div className="text-xs text-muted-foreground">cal/day</div>
          </div>
          <div className="text-center p-3 bg-lime/10 rounded-xl">
            <div className="font-bold text-lime text-lg">{weeklyAvg.protein}g</div>
            <div className="text-xs text-muted-foreground">protein</div>
          </div>
          <div className="text-center p-3 bg-sunny/20 rounded-xl">
            <div className="font-bold text-charcoal text-lg">{weeklyAvg.carbs}g</div>
            <div className="text-xs text-muted-foreground">carbs</div>
          </div>
          <div className="text-center p-3 bg-pink/10 rounded-xl">
            <div className="font-bold text-pink text-lg">{weeklyAvg.fat}g</div>
            <div className="text-xs text-muted-foreground">fat</div>
          </div>
        </div>
      </Card>

      {/* Goal Progress */}
      <Card className="p-4 border-2 border-sunny/30">
        <h3 className="font-display font-bold text-charcoal mb-3 flex items-center gap-2">
          <span>🎯</span> Goal Progress
        </h3>
        <div className="space-y-3">
          {goals.includes("weight-loss") && (
            <div className="flex items-center gap-3 p-3 bg-lime/10 rounded-xl">
              <span className="text-2xl">⬇️</span>
              <div className="flex-1">
                <div className="font-bold text-charcoal">Weight Loss</div>
                <div className="text-xs text-muted-foreground">Averaging {weeklyAvg.calories} cal/day (target: {targetCalories})</div>
              </div>
              <Badge className="bg-lime text-white">On Track</Badge>
            </div>
          )}
          {goals.includes("muscle") && (
            <div className="flex items-center gap-3 p-3 bg-purple/10 rounded-xl">
              <span className="text-2xl">💪</span>
              <div className="flex-1">
                <div className="font-bold text-charcoal">Build Muscle</div>
                <div className="text-xs text-muted-foreground">Averaging {weeklyAvg.protein}g protein/day (target: {targetProtein}g)</div>
              </div>
              <Badge className="bg-purple text-white">{weeklyAvg.protein >= targetProtein ? "On Track" : "Needs Work"}</Badge>
            </div>
          )}
          {goals.includes("save-money") && (
            <div className="flex items-center gap-3 p-3 bg-sunny/20 rounded-xl">
              <span className="text-2xl">💰</span>
              <div className="flex-1">
                <div className="font-bold text-charcoal">Save Money</div>
                <div className="text-xs text-muted-foreground">Spent $62 this week (budget: $80)</div>
              </div>
              <Badge className="bg-sunny text-charcoal">Under Budget!</Badge>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
