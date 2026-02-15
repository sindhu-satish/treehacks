"use client";

import { useMemo, useState } from "react";
import { MealPlan, PlannedMeal } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, Undo2, UtensilsCrossed } from "lucide-react";

type MealType = "breakfast" | "lunch" | "dinner" | "snacks" | "dessert";

export type ActualMealEntry = {
  id: string;
  dateKey: string; // YYYY-MM-DD
  mealType: MealType;
  photoUrl?: string; // objectURL
  dish_name: string;
  calories_estimate: number;
  confidence: "low" | "medium" | "high";
  notes: string;
  createdAt: string; // ISO
};

interface MealCalendarProps {
  mealPlan: MealPlan;

  // NEW: actual “post-eating” logs keyed by YYYY-MM-DD + mealType
  actualMeals: Record<string, Partial<Record<MealType, ActualMealEntry>>>;

  // NEW: open the shared Log Meal modal from a calendar cell
  onRequestLogMeal: (args: { dateKey: string; mealType: MealType }) => void;

  // OPTIONAL: allow parent to clear a logged meal
  onRequestClearMeal?: (args: { dateKey: string; mealType: MealType }) => void;
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snacks", "dessert"];

const mealTypeLabels: Record<MealType, { label: string; icon: string }> = {
  breakfast: { label: "Breakfast", icon: "🌅" },
  lunch: { label: "Lunch", icon: "☀️" },
  dinner: { label: "Dinner", icon: "🌙" },
  snacks: { label: "Snacks", icon: "🍎" },
  dessert: { label: "Dessert", icon: "🍰" },
};

function toDateKey(d: Date) {
  // local YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function MealCalendar({ mealPlan, actualMeals, onRequestLogMeal, onRequestClearMeal }: MealCalendarProps) {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  const [enabledMeals, setEnabledMeals] = useState<Record<MealType, boolean>>({
    breakfast: true,
    lunch: true,
    dinner: true,
    snacks: false,
    dessert: false,
  });

  const [removedMeals, setRemovedMeals] = useState<Set<string>>(new Set());
  const [eatingOutMeals, setEatingOutMeals] = useState<Set<string>>(new Set());
  const [showEatingOutModal, setShowEatingOutModal] = useState<{ dayIndex: number; mealType: MealType } | null>(null);
  const [showSwapModal, setShowSwapModal] = useState<{ dayIndex: number; mealType: MealType; currentRecipe: PlannedMeal } | null>(null);
  const [showAddMealModal, setShowAddMealModal] = useState<{ dayIndex: number; mealType: MealType } | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);

  const [swappedMeals, setSwappedMeals] = useState<Record<string, { name: string; calories: number; time: number; image: string }>>({});
  const [addedMeals, setAddedMeals] = useState<Record<string, { name: string; calories: number; time: number; image: string }>>({});

  const getWeekDates = (offset: number) => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(today.getDate() - today.getDay() + offset * 7);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      date.setHours(0, 0, 0, 0);
      return date;
    });
  };

  const weekDates = useMemo(() => getWeekDates(currentWeekOffset), [currentWeekOffset]);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  const formatWeekRange = () => {
    const startMonth = weekStart.toLocaleDateString("en-US", { month: "short" });
    const endMonth = weekEnd.toLocaleDateString("en-US", { month: "short" });
    const startDay = weekStart.getDate();
    const endDay = weekEnd.getDate();
    const year = weekEnd.getFullYear();

    if (startMonth === endMonth) return `${startMonth} ${startDay} - ${endDay}, ${year}`;
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  };

  const toggleMealType = (type: MealType) => setEnabledMeals((prev) => ({ ...prev, [type]: !prev[type] }));

  const toggleMealRemoved = (dayIndex: number, mealType: MealType) => {
    const key = `${dayIndex}-${mealType}`;
    setRemovedMeals((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isMealRemoved = (dayIndex: number, mealType: MealType) => removedMeals.has(`${dayIndex}-${mealType}`);

  const toggleEatingOut = (dayIndex: number, mealType: MealType) => {
    const key = `${dayIndex}-${mealType}`;
    setEatingOutMeals((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        setRemovedMeals((r) => {
          const rr = new Set(r);
          rr.delete(key);
          return rr;
        });
      } else {
        next.add(key);
        setRemovedMeals((r) => {
          const rr = new Set(r);
          rr.add(key);
          return rr;
        });
      }
      return next;
    });
  };

  const isEatingOut = (dayIndex: number, mealType: MealType) => eatingOutMeals.has(`${dayIndex}-${mealType}`);

  // totals (planned-only; actual logs are “after the fact”)
  const activeMeals = mealPlan.days.flatMap((day, dayIndex) =>
    Object.entries(day.meals)
      .filter(([type]) => enabledMeals[type as MealType] && !isMealRemoved(dayIndex, type as MealType))
      .flatMap(([, meal]) => (Array.isArray(meal) ? meal : meal ? [meal] : []))
  ) as PlannedMeal[];

  const totalCost = activeMeals.reduce(
    (sum, meal) => sum + ((meal.recipe.estimatedCost || 0) / (meal.recipe.servings || 1)) * (meal.servings || 1),
    0
  );

  const alternativeMeals = [
    { id: "alt1", name: "Quinoa Buddha Bowl", calories: 420, time: 25, image: "🥗" },
    { id: "alt2", name: "Veggie Stir Fry", calories: 380, time: 20, image: "🥘" },
    { id: "alt3", name: "Mediterranean Wrap", calories: 450, time: 15, image: "🌯" },
    { id: "alt4", name: "Chickpea Curry", calories: 400, time: 30, image: "🍛" },
    { id: "alt5", name: "Lemon Herb Salmon", calories: 350, time: 25, image: "🐟" },
    { id: "alt6", name: "Mushroom Risotto", calories: 480, time: 35, image: "🍚" },
    { id: "alt7", name: "Thai Peanut Noodles", calories: 520, time: 20, image: "🍜" },
    { id: "alt8", name: "Greek Salad Bowl", calories: 320, time: 15, image: "🥙" },
  ];

  const snackSuggestions = [
    { id: "snack1", name: "Apple with Almond Butter", calories: 180, time: 2, image: "🍎" },
    { id: "snack2", name: "Greek Yogurt & Berries", calories: 150, time: 2, image: "🫐" },
    { id: "snack3", name: "Trail Mix", calories: 200, time: 1, image: "🥜" },
    { id: "snack4", name: "Hummus & Veggies", calories: 160, time: 5, image: "🥕" },
    { id: "snack5", name: "Energy Balls", calories: 120, time: 1, image: "🟤" },
    { id: "snack6", name: "Cheese & Crackers", calories: 220, time: 2, image: "🧀" },
  ];

  const dessertSuggestions = [
    { id: "dessert1", name: "Dark Chocolate Square", calories: 80, time: 1, image: "🍫" },
    { id: "dessert2", name: "Fruit Sorbet", calories: 120, time: 5, image: "🍨" },
    { id: "dessert3", name: "Chia Pudding", calories: 180, time: 5, image: "🥄" },
    { id: "dessert4", name: "Baked Apple", calories: 150, time: 20, image: "🍏" },
    { id: "dessert5", name: "Banana Nice Cream", calories: 140, time: 5, image: "🍌" },
    { id: "dessert6", name: "Coconut Date Bites", calories: 100, time: 2, image: "🥥" },
  ];

  const handleAddMeal = (dayIndex: number, mealType: MealType, meal: { name: string; calories: number; time: number; image: string }) => {
    const key = `${dayIndex}-${mealType}`;
    setAddedMeals((prev) => ({ ...prev, [key]: meal }));
    setShowAddMealModal(null);
  };

  const handleRemoveAddedMeal = (dayIndex: number, mealType: MealType) => {
    const key = `${dayIndex}-${mealType}`;
    setAddedMeals((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleRegenerateMeal = async (dayIndex: number, mealType: MealType) => {
    const key = `${dayIndex}-${mealType}`;
    setIsRegenerating(key);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const randomMeal = alternativeMeals[Math.floor(Math.random() * alternativeMeals.length)];
    setSwappedMeals((prev) => ({ ...prev, [key]: randomMeal }));
    setIsRegenerating(null);
  };

  const handleSwapMeal = (dayIndex: number, mealType: MealType, meal: PlannedMeal) => setShowSwapModal({ dayIndex, mealType, currentRecipe: meal });

  const handleSelectSwap = (dayIndex: number, mealType: MealType, newMeal: { name: string; calories: number; time: number; image: string }) => {
    const key = `${dayIndex}-${mealType}`;
    setSwappedMeals((prev) => ({ ...prev, [key]: newMeal }));
    setShowSwapModal(null);
  };

  const getDisplayMeal = (dayIndex: number, mealType: MealType, originalMeal: PlannedMeal | undefined) => {
    const key = `${dayIndex}-${mealType}`;
    const swapped = swappedMeals[key];
    const added = addedMeals[key];
    if (swapped) return { isSwapped: true, isAdded: false, name: swapped.name, calories: swapped.calories, image: swapped.image };
    if (added) return { isSwapped: false, isAdded: true, name: added.name, calories: added.calories, image: added.image };
    if (originalMeal)
      return {
        isSwapped: false,
        isAdded: false,
        name: originalMeal.recipe.name,
        calories: originalMeal.recipe.nutrition.calories,
        cost: originalMeal.recipe.estimatedCost ? (originalMeal.recipe.estimatedCost / originalMeal.recipe.servings) * (originalMeal.servings || 1) : undefined,
      };
    return null;
  };

  const getSwapSuggestions = (currentName: string) => alternativeMeals.filter((m) => m.name !== currentName).slice(0, 4);

  return (
    <div className="bg-white rounded-2xl border-2 border-primary/20 overflow-hidden shadow-playful">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-cream/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-foreground flex items-center gap-2 text-lg">
              <span>📅</span> Your Weekly Meal Plan
            </h3>
            <p className="text-sm text-muted-foreground mt-1">Planned meals vs what you actually ate • Hover to log 📸</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">${totalCost.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground">estimated total</div>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => setCurrentWeekOffset((p) => p - 1)} className="text-muted-foreground">
            ← Previous
          </Button>
          <div className="text-center">
            <div className="font-semibold text-foreground">{formatWeekRange()}</div>
            {currentWeekOffset === 0 && <Badge className="bg-primary/10 text-primary border-0 text-xs mt-1">Current Week</Badge>}
            {currentWeekOffset < 0 && <Badge className="bg-muted text-muted-foreground border-0 text-xs mt-1">Past</Badge>}
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrentWeekOffset((p) => p + 1)} className="text-muted-foreground">
            Next →
          </Button>
        </div>

        {/* Meal Type Toggles */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground mr-2 self-center">Include:</span>
          {mealTypes.map((type) => (
            <button
              key={type}
              onClick={() => toggleMealType(type)}
              className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                enabledMeals[type]
                  ? "bg-primary text-white ring-2 ring-primary ring-offset-2 shadow-md scale-105"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent"
              }`}
            >
              {mealTypeLabels[type].icon} {mealTypeLabels[type].label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-border/50">
            {weekDates.map((date, idx) => {
              const isToday = new Date().toDateString() === date.toDateString();
              const isPast = date < new Date() && !isToday;
              return (
                <div
                  key={idx}
                  className={`p-3 text-center border-r border-border/30 last:border-r-0 ${isToday ? "bg-primary/10" : isPast ? "bg-muted/30" : ""}`}
                >
                  <div className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>{dayNames[date.getDay()]}</div>
                  <div className={`text-lg font-bold ${isToday ? "text-primary" : isPast ? "text-muted-foreground" : "text-foreground"}`}>{date.getDate()}</div>
                </div>
              );
            })}
          </div>

          {/* Meal Rows */}
          {mealTypes
            .filter((type) => enabledMeals[type])
            .map((mealType) => (
              <div key={mealType} className="grid grid-cols-7 border-b border-border/30 last:border-b-0">
                {mealPlan.days.map((day, idx) => {
                  const dateKey = toDateKey(weekDates[idx]);
                  const actual = actualMeals?.[dateKey]?.[mealType];

                  const meal =
                    mealType === "snacks" || mealType === "dessert"
                      ? undefined
                      : (day.meals[mealType as keyof typeof day.meals] as any);

                  const mealData = Array.isArray(meal) ? undefined : (meal as PlannedMeal | undefined);

                  const isRemoved = isMealRemoved(idx, mealType);
                  const isOut = isEatingOut(idx, mealType);
                  const isPast = weekDates[idx] < new Date() && new Date().toDateString() !== weekDates[idx].toDateString();

                  const showActual = !!actual;

                  return (
                    <div
                      key={idx}
                      className={`p-2 border-r border-border/30 last:border-r-0 min-h-[110px] relative group ${
                        isPast ? "bg-muted/20" : ""
                      } ${isOut ? "bg-amber-400/10" : ""} ${showActual ? "bg-accent/5" : ""}`}
                    >
                      {idx === 0 && (
                        <Badge variant="outline" className="mb-2 text-xs capitalize bg-amber-400/20 border-amber-400/30 font-display font-bold">
                          {mealTypeLabels[mealType].icon} {mealTypeLabels[mealType].label}
                        </Badge>
                      )}

                      {/* ACTUAL (post-eating) display */}
                      {showActual && !isRemoved ? (
                        <div className="rounded-lg p-2 bg-white/70 border border-accent/20">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-bold text-accent flex items-center gap-1">
                              <span>✅</span> Ate
                            </div>
                            <div className="text-xs text-muted-foreground">{actual.calories_estimate} cal</div>
                          </div>

                          <div className="mt-1 text-xs font-medium text-foreground line-clamp-2">{actual.dish_name}</div>

                          <div className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{actual.notes}</div>

                          {/* hover affordance */}
                          <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-white/90 rounded-lg p-2 text-center border border-border/50">
                              <div className="text-xs font-bold text-primary">{actual.calories_estimate} cal</div>
                              <div className="text-xs text-muted-foreground">tap 📸 to replace</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        (() => {
                          const displayMeal = getDisplayMeal(idx, mealType, mealData);

                          if (isOut) {
                            return (
                              <div
                                onClick={() => onRequestLogMeal({ dateKey, mealType })}
                                className="cursor-pointer hover:bg-amber-400/20 rounded-lg p-1 -m-1 transition-colors"
                              >
                                <div className="text-xs font-bold text-amber-500 flex items-center gap-1">
                                  <UtensilsCrossed className="w-3 h-3" />
                                  Eating Out
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">Use camera to log meal</div>
                                <Badge className="mt-1 text-xs bg-amber-400/20 text-foreground border-0">Log photo</Badge>
                              </div>
                            );
                          }

                          if (displayMeal && !isRemoved) {
                            return (
                              <div
                                className="rounded-lg p-1 -m-1"
                              >
                                {(displayMeal.isSwapped || displayMeal.isAdded) && <div className="text-lg mb-1">{(displayMeal as any).image}</div>}
                                <div className="text-xs font-medium text-foreground line-clamp-2">
                                  {displayMeal.name}
                                  {displayMeal.isSwapped && <Badge className="ml-1 text-[10px] bg-violet-500/20 text-violet-500 border-0">New</Badge>}
                                  {displayMeal.isAdded && <Badge className="ml-1 text-[10px] bg-accent/20 text-accent border-0">Added</Badge>}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">{displayMeal.calories} cal</div>
                              </div>
                            );
                          }

                          if (isRemoved && !isOut) return <div className="text-xs text-muted-foreground italic">Skipped</div>;

                          return (
                            <div className="text-xs text-muted-foreground italic">
                              {mealType === "snacks" || mealType === "dessert" ? "Add..." : "No meal"}
                            </div>
                          );
                        })()
                      )}

                      {/* Regenerating */}
                      {isRegenerating === `${idx}-${mealType}` && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                          <div className="text-center">
                            <div className="text-2xl animate-spin">🔄</div>
                            <div className="text-xs text-muted-foreground">Finding new meal...</div>
                          </div>
                        </div>
                      )}

                      {/* Hover actions: 📸 log + planned controls */}
                      {!isRegenerating && (
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* 📸 Log/Replace actual */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRequestLogMeal({ dateKey, mealType });
                            }}
                            className="w-5 h-5 rounded-full text-xs bg-primary/20 text-foreground hover:bg-primary/35"
                            title={showActual ? "Replace logged meal" : "Log what you ate"}
                          >
                            <Camera className="w-3 h-3 mx-auto" />
                          </button>

                          {/* Clear actual */}
                          {showActual && onRequestClearMeal && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRequestClearMeal({ dateKey, mealType });
                              }}
                              className="w-5 h-5 rounded-full text-xs bg-muted/60 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                              title="Clear logged meal"
                            >
                              ×
                            </button>
                          )}

                          {/* Planned meal controls: regenerate or mark eat out */}
                          {!showActual && mealData && !isOut && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRegenerateMeal(idx, mealType);
                                }}
                                className="w-5 h-5 rounded-full text-xs bg-accent/30 text-foreground hover:bg-accent/50"
                                title="Generate different meal"
                              >
                                <RefreshCw className="w-3 h-3 mx-auto" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleEatingOut(idx, mealType);
                                }}
                                className="w-5 h-5 rounded-full text-xs bg-amber-400/30 text-foreground hover:bg-amber-400/50"
                                title="Mark as eating out"
                              >
                                <UtensilsCrossed className="w-3 h-3 mx-auto" />
                              </button>
                            </>
                          )}

                          {/* If already marked as eating out, allow quick undo */}
                          {!showActual && isOut && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleEatingOut(idx, mealType);
                              }}
                              className="w-5 h-5 rounded-full text-xs bg-amber-400/40 text-foreground hover:bg-amber-400/60"
                              title="Undo eating out"
                            >
                              <Undo2 className="w-3 h-3 mx-auto" />
                            </button>
                          )}

                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            ))}

          {/* Daily totals row: prefer actual calories if logged, else planned */}
          <div className="grid grid-cols-7 bg-muted/30">
            {mealPlan.days.map((day, idx) => {
              const dateKey = toDateKey(weekDates[idx]);

              const activeDayMeals = Object.entries(day.meals)
                .filter(([type]) => enabledMeals[type as MealType] && !isMealRemoved(idx, type as MealType))
                .flatMap(([, meal]) => (Array.isArray(meal) ? meal : meal ? [meal] : [])) as PlannedMeal[];

              const plannedCalories = activeDayMeals.reduce((sum, m) => sum + (m.recipe.nutrition.calories || 0), 0);
              const plannedProtein = activeDayMeals.reduce((sum, m) => sum + (m.recipe.nutrition.protein || 0), 0);

              const actualForDay = actualMeals?.[dateKey] || {};
              const actualCalories = (Object.values(actualForDay) as ActualMealEntry[]).reduce(
                (sum, a) => sum + (a?.calories_estimate || 0),
                0
              );

              const hasAnyActual = actualCalories > 0;

              return (
                <div key={idx} className="p-2 border-r border-border/30 last:border-r-0">
                  <div className="text-xs text-muted-foreground mb-1">Daily total</div>
                  <div className="text-sm font-bold text-primary">
                    {hasAnyActual ? `${actualCalories} cal` : `${plannedCalories} cal`}
                  </div>
                  <div className="text-xs text-muted-foreground">{plannedProtein}g protein</div>
                  {hasAnyActual && <div className="text-[11px] text-accent mt-0.5">using logged meals</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Eating Out Modal (unchanged UI, but you can wire it later to photo logging too) */}
      {showEatingOutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-foreground">Log Your Meal</h2>
              <button onClick={() => setShowEatingOutModal(null)} className="text-muted-foreground hover:text-foreground text-2xl">
                ×
              </button>
            </div>

            <div className="text-sm text-muted-foreground mb-4">
              {mealTypeLabels[showEatingOutModal.mealType].icon} {mealTypeLabels[showEatingOutModal.mealType].label} •{" "}
              {weekDates[showEatingOutModal.dayIndex]?.toLocaleDateString()}
            </div>

            <div className="border-2 border-dashed border-amber-400/50 rounded-2xl p-6 text-center mb-4 hover:border-amber-400 transition-colors cursor-pointer bg-amber-400/5">
              <div className="text-4xl mb-2">📸</div>
              <p className="font-bold text-foreground mb-1">Add a photo</p>
              <p className="text-xs text-muted-foreground">We&apos;ll estimate the nutrition</p>
            </div>

            <div className="mb-4">
              <label className="font-bold text-foreground mb-2 block text-sm">Where did you eat?</label>
              <input
                type="text"
                placeholder="Restaurant name or location..."
                className="w-full p-3 border-2 border-border rounded-xl focus:outline-none focus:border-amber-400 text-sm"
              />
            </div>

            <div className="mb-4">
              <label className="font-bold text-foreground mb-2 block text-sm">What did you have?</label>
              <textarea
                placeholder="Describe your meal..."
                className="w-full p-3 border-2 border-border rounded-xl resize-none h-20 focus:outline-none focus:border-amber-400 text-sm"
              />
            </div>

            <div className="mb-6">
              <label className="font-bold text-foreground mb-2 block text-sm">Estimated calories (optional)</label>
              <input
                type="number"
                placeholder="e.g., 650"
                className="w-full p-3 border-2 border-border rounded-xl focus:outline-none focus:border-amber-400 text-sm"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  toggleEatingOut(showEatingOutModal.dayIndex, showEatingOutModal.mealType);
                  setShowEatingOutModal(null);
                }}
                className="flex-1 border-2"
              >
                Cancel Eating Out
              </Button>
              <Button onClick={() => setShowEatingOutModal(null)} className="flex-1 bg-amber-400 text-foreground font-bold">
                Save
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Swap Meal Modal */}
      {showSwapModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-foreground">Swap Meal</h2>
              <button onClick={() => setShowSwapModal(null)} className="text-muted-foreground hover:text-foreground text-2xl">
                ×
              </button>
            </div>

            <div className="mb-4 p-3 bg-primary/10 rounded-xl">
              <div className="text-xs text-muted-foreground mb-1">Current meal</div>
              <div className="font-bold text-foreground">{showSwapModal.currentRecipe.recipe.name}</div>
              <div className="text-sm text-muted-foreground">
                {showSwapModal.currentRecipe.recipe.nutrition.calories} cal •{" "}
                {showSwapModal.currentRecipe.recipe.prepTime + showSwapModal.currentRecipe.recipe.cookTime} min
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm font-bold text-foreground mb-3">Swap with:</div>
              <div className="space-y-2">
                {getSwapSuggestions(showSwapModal.currentRecipe.recipe.name).map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSelectSwap(showSwapModal.dayIndex, showSwapModal.mealType, suggestion)}
                    className="w-full p-3 bg-muted/30 rounded-xl text-left hover:bg-accent/10 hover:border-accent border-2 border-transparent transition-all flex items-center gap-3"
                  >
                    <span className="text-3xl">{suggestion.image}</span>
                    <div className="flex-1">
                      <div className="font-bold text-foreground">{suggestion.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {suggestion.calories} cal • {suggestion.time} min
                      </div>
                    </div>
                    <span className="text-accent text-lg">→</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setShowSwapModal(null);
                handleRegenerateMeal(showSwapModal.dayIndex, showSwapModal.mealType);
              }}
              className="w-full p-3 border-2 border-dashed border-violet-500/30 rounded-xl text-center hover:bg-violet-500/10 transition-colors"
            >
              <span className="text-lg mr-2">✨</span>
              <span className="font-bold text-violet-500">Generate a completely new suggestion</span>
            </button>

            <div className="mt-4 pt-4 border-t border-border/50">
              <Button variant="outline" onClick={() => setShowSwapModal(null)} className="w-full border-2">
                Keep Current Meal
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add Meal Modal */}
      {showAddMealModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-foreground">
                Add {mealTypeLabels[showAddMealModal.mealType].icon} {mealTypeLabels[showAddMealModal.mealType].label}
              </h2>
              <button onClick={() => setShowAddMealModal(null)} className="text-muted-foreground hover:text-foreground text-2xl">
                ×
              </button>
            </div>

            <div className="text-sm text-muted-foreground mb-4">
              {weekDates[showAddMealModal.dayIndex]?.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </div>

            <div className="mb-4">
              <div className="text-sm font-bold text-foreground mb-3">Quick picks:</div>
              <div className="space-y-2">
                {(showAddMealModal.mealType === "snacks"
                  ? snackSuggestions
                  : showAddMealModal.mealType === "dessert"
                  ? dessertSuggestions
                  : alternativeMeals.slice(0, 6)
                ).map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleAddMeal(showAddMealModal.dayIndex, showAddMealModal.mealType, suggestion)}
                    className="w-full p-3 bg-muted/30 rounded-xl text-left hover:bg-accent/10 hover:border-accent border-2 border-transparent transition-all flex items-center gap-3"
                  >
                    <span className="text-3xl">{suggestion.image}</span>
                    <div className="flex-1">
                      <div className="font-bold text-foreground">{suggestion.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {suggestion.calories} cal • {suggestion.time} min
                      </div>
                    </div>
                    <span className="text-accent text-lg">+</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() =>
                handleAddMeal(showAddMealModal.dayIndex, showAddMealModal.mealType, {
                  name: "Custom " + mealTypeLabels[showAddMealModal.mealType].label,
                  calories: 200,
                  time: 10,
                  image: mealTypeLabels[showAddMealModal.mealType].icon,
                })
              }
              className="w-full p-3 border-2 border-dashed border-primary/30 rounded-xl text-center hover:bg-primary/10 transition-colors"
            >
              <span className="text-lg mr-2">✏️</span>
              <span className="font-bold text-primary">Add custom item</span>
            </button>

            <div className="mt-4 pt-4 border-t border-border/50">
              <Button variant="outline" onClick={() => setShowAddMealModal(null)} className="w-full border-2">
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}




