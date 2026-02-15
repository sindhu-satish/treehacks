"use client";
import FoodPhotoTracker from "@/components/nutrition/FoodPhotoTracker";
import { Suspense, useMemo, useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChatMessage, DateSeparator } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { GroceryComparison } from "@/components/marketplace/GroceryComparison";
import { MealCalendar, ActualMealEntry } from "@/components/calendar/MealCalendar";
import { GroceryList } from "@/components/calendar/GroceryList";
import { MahmLogo } from "@/components/brand/MahmLogo";
import { NutritionDashboard } from "@/components/nutrition/NutritionDashboard";
import { dummyRecipes } from "@/lib/dummy-data";
import { useAuth } from "@/contexts/AuthContext";
import { LoginModal } from "@/components/auth/LoginModal";

/** Extract ingredient names for Bright Data: handles string[] or {name, unit, amount, ...}[] */
function extractIngredientNames(ings: unknown): string[] {
  if (!ings || !Array.isArray(ings)) return [];
  return ings
    .map((i) => {
      if (typeof i === "string" && i.trim()) return i.trim();
      if (i && typeof i === "object" && "name" in i) {
        const name = (i as { name?: string }).name;
        return typeof name === "string" ? name.trim() : "";
      }
      return "";
    })
    .filter((n) => n.length > 0);
}

function createEmptyMealPlan(): MealPlan {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const days: MealDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return {
      date,
      meals: { breakfast: undefined, lunch: undefined, dinner: undefined },
      dailyNutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    };
  });
  return {
    id: "meal-plan-1",
    startDate: startOfWeek,
    endDate: endOfWeek,
    days,
    totalCost: 0,
    groceryList: [],
  };
}
import { healthCheck, sendChatMessage, comparePrices, estimateNutrition, getDefaultMeals, type MealSuggestion } from "@/lib/api";
import {
  ChatMessage as ChatMessageType,
  GroceryComparison as GroceryComparisonType,
  MealPlan,
  MealDay,
  PlannedMeal,
  Recipe,
  ChatRecipeFromApi,
} from "@/types";

type MealType = "breakfast" | "lunch" | "dinner" | "snacks" | "dessert";

function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const ACTUAL_MEALS_LS_KEY = "mahm_actual_meals_v1";

function serializeActualMeals(
  actualMeals: Record<string, Partial<Record<MealType, ActualMealEntry>>>
) {
  // localStorage cannot store object URLs reliably across reloads.
  // We persist everything except photoUrl.
  const out: Record<string, Partial<Record<MealType, Omit<ActualMealEntry, "photoUrl">>>> = {};
  for (const [dateKey, day] of Object.entries(actualMeals)) {
    const nextDay: Partial<Record<MealType, Omit<ActualMealEntry, "photoUrl">>> = {};
    for (const [mealType, entry] of Object.entries(day) as Array<[MealType, ActualMealEntry | undefined]>) {
      if (!entry) continue;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { photoUrl, ...rest } = entry;
      nextDay[mealType] = rest;
    }
    if (Object.keys(nextDay).length) out[dateKey] = nextDay;
  }
  return out;
}

function safeParseActualMeals(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;

    // light validation + coerce into expected shape; photoUrl will be undefined after restore
    const out: Record<string, Partial<Record<MealType, ActualMealEntry>>> = {};
    for (const [dateKey, day] of Object.entries(parsed as Record<string, any>)) {
      if (typeof dateKey !== "string" || !day || typeof day !== "object") continue;

      const nextDay: Partial<Record<MealType, ActualMealEntry>> = {};
      for (const [mealType, entry] of Object.entries(day as Record<string, any>)) {
        if (
          mealType !== "breakfast" &&
          mealType !== "lunch" &&
          mealType !== "dinner" &&
          mealType !== "snacks" &&
          mealType !== "dessert"
        ) {
          continue;
        }
        if (!entry || typeof entry !== "object") continue;

        // only pick fields we expect
        const cleaned: ActualMealEntry = {
          id: String(entry.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`),
          dateKey,
          mealType: mealType as MealType,
          photoUrl: undefined, // cannot restore
          dish_name: String(entry.dish_name ?? "Meal"),
          calories_estimate: Number(entry.calories_estimate ?? 0),
          confidence:
            entry.confidence === "low" || entry.confidence === "medium" || entry.confidence === "high"
              ? entry.confidence
              : "medium",
          notes: String(entry.notes ?? ""),
          createdAt: String(entry.createdAt ?? new Date().toISOString()),
        };

        nextDay[mealType as MealType] = cleaned;
      }

      if (Object.keys(nextDay).length) out[dateKey] = nextDay;
    }

    return out;
  } catch {
    return null;
  }
}

function MealLogModal({
  onClose,
  onAnalyzed,
  defaultTarget,
}: {
  onClose: () => void;
  onAnalyzed: (args: {
    file: File;
    target: { dateKey: string; mealType: MealType };
    result: {
      dish_name: string;
      calories_estimate: number;
      confidence: "low" | "medium" | "high";
      notes: string;
    };
  }) => void;
  defaultTarget?: { dateKey: string; mealType: MealType } | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [runSignal, setRunSignal] = useState(0);
  const [isLogging, setIsLogging] = useState(false);
  const [targetDateKey, setTargetDateKey] = useState<string>(() => defaultTarget?.dateKey ?? toDateKey(new Date()));
  const [mealType, setMealType] = useState<MealType>(defaultTarget?.mealType ?? "dinner");

  const mealTypeOptions: { type: MealType; label: string }[] = [
    { type: "breakfast", label: "Breakfast" },
    { type: "lunch", label: "Lunch" },
    { type: "dinner", label: "Dinner" },
    { type: "snacks", label: "Snacks" },
    { type: "dessert", label: "Dessert" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-bold text-foreground">Log a Meal</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl">
            ×
          </button>
        </div>

        <div className="mb-4">
          <label className="text-sm font-bold text-foreground mb-1 block">Date</label>
          <input
            type="date"
            value={targetDateKey}
            onChange={(e) => setTargetDateKey(e.target.value)}
            className="w-full p-2 border-2 border-border rounded-xl"
          />
        </div>

        <div className="mb-4">
          <label className="text-sm font-bold text-foreground mb-2 block">Meal Type</label>
          <div className="flex flex-wrap gap-2">
            {mealTypeOptions.map((m) => (
              <button
                key={m.type}
                onClick={() => setMealType(m.type)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  mealType === m.type ? "bg-primary text-white" : "bg-primary/10 text-primary"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          className="mb-4 border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer border-primary/40 hover:border-primary"
        >
          <div className="text-3xl mb-2">📷</div>
          <p className="font-medium text-foreground">{photoFile ? photoFile.name : "Tap to upload meal photo"}</p>
        </div>

        {photoFile && (
          <div className="mb-4">
            <FoodPhotoTracker
              file={photoFile}
              runSignal={runSignal}
              onResult={(r: any) => {
                setIsLogging(false);
                if (r && r.ok) {
                  onAnalyzed({
                    file: photoFile,
                    target: { dateKey: targetDateKey, mealType },
                    result: {
                      dish_name: r.dish_name,
                      calories_estimate: r.calories_estimate,
                      confidence: r.confidence,
                      notes: r.notes,
                    },
                  });
                  onClose();
                }
              }}
            />
          </div>
        )}

        <Button
          className="w-full gradient-coral text-white font-bold"
          disabled={!photoFile || isLogging}
          onClick={() => {
            if (!photoFile) return;
            setIsLogging(true);
            setRunSignal((x) => x + 1);
          }}
        >
          {isLogging ? "Analyzing..." : "Analyze & Log"}
        </Button>
      </Card>
    </div>
  );
}

// Helper function to categorize ingredients for grocery list
function categorizeIngredient(name: string): string {
  const lowerName = name.toLowerCase();
  if (/chicken|beef|pork|fish|salmon|tofu|egg|shrimp/.test(lowerName)) return "protein";
  if (/milk|cheese|yogurt|cream|butter/.test(lowerName)) return "dairy";
  if (/apple|banana|berry|lemon|lime|orange|fruit/.test(lowerName)) return "produce";
  if (/spinach|lettuce|tomato|onion|garlic|pepper|cucumber|carrot|broccoli|vegetable/.test(lowerName)) return "produce";
  if (/rice|pasta|bread|flour|oat|quinoa|grain/.test(lowerName)) return "grains";
  if (/oil|vinegar|sauce|soy|honey|maple|sugar/.test(lowerName)) return "pantry";
  if (/salt|pepper|cumin|paprika|oregano|basil|spice|herb/.test(lowerName)) return "spices";
  if (/bean|chickpea|lentil|can/.test(lowerName)) return "canned";
  return "other";
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Auto-open login modal if ?login=true
  useEffect(() => {
    if (searchParams.get("login") === "true" && !user) {
      setShowLoginModal(true);
    }
  }, [searchParams, user]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [showRecipes, setShowRecipes] = useState(true);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [showMealLog, setShowMealLog] = useState(false);
  const [showNutritionDashboard, setShowNutritionDashboard] = useState(false);
  const [marketplaceComparisons, setMarketplaceComparisons] = useState<GroceryComparisonType[]>([]);
  const [groceryListItems, setGroceryListItems] = useState<{ name: string; amount: string; category: string; estimatedPrice: number }[]>([]);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [marketplaceError, setMarketplaceError] = useState<string | null>(null);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [mealPlan, setMealPlan] = useState<MealPlan>(createEmptyMealPlan);
  const [addToCalendarModal, setAddToCalendarModal] = useState<{
    recipe: ChatRecipeFromApi;
    dayIndex: number;
    mealType: "breakfast" | "lunch" | "dinner";
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ---------------------------
  // Recent meal photos
  // ---------------------------
  type MealPhotoEntry = {
    id: string;
    imageUrl: string; // object URL
    createdAt: Date;
    dish_name: string;
    calories_estimate: number;
    confidence: "low" | "medium" | "high";
    notes: string;
  };

  const [recentMeals, setRecentMeals] = useState<MealPhotoEntry[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<MealPhotoEntry | null>(null);

  // Calendar “actual meals” keyed by dateKey + mealType
  const [actualMeals, setActualMeals] = useState<Record<string, Partial<Record<MealType, ActualMealEntry>>>>({});

  // If calendar requests logging for a specific slot
  const [mealLogTarget, setMealLogTarget] = useState<{ dateKey: string; mealType: MealType } | null>(null);
  const initializedPlannedMealsRef = useRef(false);

  // ---- NEW: restore persisted actual meals once (metadata only; no photoUrl)
  useEffect(() => {
    const restored = safeParseActualMeals(localStorage.getItem(ACTUAL_MEALS_LS_KEY));
    if (restored) setActualMeals(restored);
  }, []);

  // ---- NEW: persist actual meals on change (metadata only; no photoUrl)
  useEffect(() => {
    try {
      const payload = serializeActualMeals(actualMeals);
      localStorage.setItem(ACTUAL_MEALS_LS_KEY, JSON.stringify(payload));
    } catch {
      // ignore quota / serialization issues
    }
  }, [actualMeals]);

  // cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      for (const m of recentMeals) URL.revokeObjectURL(m.imageUrl);
      for (const day of Object.values(actualMeals)) {
        for (const a of Object.values(day)) {
          if (a?.photoUrl) URL.revokeObjectURL(a.photoUrl);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addRecentMeal = (
    file: File,
    r: { dish_name: string; calories_estimate: number; confidence: "low" | "medium" | "high"; notes: string }
  ) => {
    const url = URL.createObjectURL(file);
    const entry: MealPhotoEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      imageUrl: url,
      createdAt: new Date(),
      dish_name: r.dish_name,
      calories_estimate: r.calories_estimate,
      confidence: r.confidence,
      notes: r.notes,
    };
    setRecentMeals((prev) => [entry, ...prev].slice(0, 12));
  };

  const upsertActualMeal = (args: {
    file: File;
    target: { dateKey: string; mealType: MealType };
    result: { dish_name: string; calories_estimate: number; confidence: "low" | "medium" | "high"; notes: string };
  }) => {
    const { file, target, result } = args;

    const photoUrl = URL.createObjectURL(file);
    const entry: ActualMealEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      dateKey: target.dateKey,
      mealType: target.mealType,
      photoUrl,
      dish_name: result.dish_name,
      calories_estimate: result.calories_estimate,
      confidence: result.confidence,
      notes: result.notes,
      createdAt: new Date().toISOString(),
    };

    setActualMeals((prev) => {
      const existingForDay = prev[target.dateKey] || {};
      const existing = existingForDay[target.mealType];

      // cleanup old URL if replacing
      if (existing?.photoUrl) URL.revokeObjectURL(existing.photoUrl);

      return {
        ...prev,
        [target.dateKey]: {
          ...existingForDay,
          [target.mealType]: entry,
        },
      };
    });
  };

  const clearActualMeal = (args: { dateKey: string; mealType: MealType }) => {
    setActualMeals((prev) => {
      const day = prev[args.dateKey];
      if (!day) return prev;

      const existing = day[args.mealType];
      if (existing?.photoUrl) URL.revokeObjectURL(existing.photoUrl);

      const nextDay = { ...day };
      delete nextDay[args.mealType];

      const next = { ...prev };
      if (Object.keys(nextDay).length === 0) delete next[args.dateKey];
      else next[args.dateKey] = nextDay;

      return next;
    });
  };

  // onboarding check
  // useEffect(() => {
  //   healthCheck().then(setBackendOk);
  // }, []);

  // auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  // Initialize planned meals for the calendar from onboarding preferences.
  // Priority: localStorage cached meals -> generate fresh meals from saved profile.
  useEffect(() => {
    if (!user?.user_id || initializedPlannedMealsRef.current) return;
    initializedPlannedMealsRef.current = true;

    const buildMealPlanFromSuggestions = (meals: MealSuggestion[]) => {
      if (!Array.isArray(meals) || meals.length === 0) return;

      const normalizeMealType = (raw: unknown): "breakfast" | "lunch" | "dinner" | "snack" => {
        const t = String(raw || "").toLowerCase().trim();
        if (t.includes("break")) return "breakfast";
        if (t.includes("lunch")) return "lunch";
        if (t.includes("dinner") || t.includes("supper")) return "dinner";
        return "snack";
      };

      const normalizedMeals = meals.map((m) => ({
        ...m,
        mealType: normalizeMealType(m.mealType),
      }));

      let breakfasts = normalizedMeals.filter((m) => m.mealType === "breakfast");
      let lunches = normalizedMeals.filter((m) => m.mealType === "lunch");
      let dinners = normalizedMeals.filter((m) => m.mealType === "dinner");

      // If backend didn't label enough meals for a slot, fill from remaining meals.
      const remaining = normalizedMeals.filter((m) => ![...breakfasts, ...lunches, ...dinners].includes(m));
      if (!breakfasts.length) breakfasts = [...remaining];
      if (!lunches.length) lunches = [...remaining];
      if (!dinners.length) dinners = [...remaining];

      if (!breakfasts.length) breakfasts = normalizedMeals;
      if (!lunches.length) lunches = normalizedMeals;
      if (!dinners.length) dinners = normalizedMeals;

      const supplementPool = (primary: MealSuggestion[]) => {
        if (primary.length >= 3) return primary;
        const seen = new Set(primary.map((m) => m.id));
        const extras = normalizedMeals.filter((m) => !seen.has(m.id)).slice(0, 3 - primary.length);
        return [...primary, ...extras];
      };
      breakfasts = supplementPool(breakfasts);
      lunches = supplementPool(lunches);
      dinners = supplementPool(dinners);

      if (breakfasts.length === 0 && lunches.length === 0 && dinners.length === 0) return;

      const toPlannedMeal = (meal: MealSuggestion): PlannedMeal => {
        const recipe: Recipe = {
          id: meal.id,
          name: meal.name,
          description: meal.description,
          ingredients: (meal.ingredients || []).map((name) => ({ name, amount: 1, unit: "" })),
          instructions: meal.instructions || [],
          prepTime: meal.prepTime || 0,
          cookTime: meal.cookTime || 0,
          servings: meal.servings || 1,
          nutrition: meal.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
          dietaryTags: meal.dietaryTags || [],
          cuisine: "",
          difficulty: "easy",
        };
        return { recipe, servings: meal.servings || 1 };
      };

      setMealPlan((prev) => {
        const pickVaried = (arr: MealSuggestion[], idx: number, seed: number) => {
          if (!arr.length) return undefined;
          return arr[(idx * 2 + seed) % arr.length];
        };

        const days = prev.days.map((day, idx) => {
          const breakfast = pickVaried(breakfasts, idx, 0);
          const lunch = pickVaried(lunches, idx, 1);
          const dinner = pickVaried(dinners, idx, 2);

          const breakfastPm = breakfast ? toPlannedMeal(breakfast) : undefined;
          const lunchPm = lunch ? toPlannedMeal(lunch) : undefined;
          const dinnerPm = dinner ? toPlannedMeal(dinner) : undefined;

          return {
            ...day,
            meals: {
              ...day.meals,
              breakfast: breakfastPm,
              lunch: lunchPm,
              dinner: dinnerPm,
            },
            dailyNutrition: {
              calories:
                (breakfastPm?.recipe.nutrition.calories || 0) +
                (lunchPm?.recipe.nutrition.calories || 0) +
                (dinnerPm?.recipe.nutrition.calories || 0),
              protein:
                (breakfastPm?.recipe.nutrition.protein || 0) +
                (lunchPm?.recipe.nutrition.protein || 0) +
                (dinnerPm?.recipe.nutrition.protein || 0),
              carbs:
                (breakfastPm?.recipe.nutrition.carbs || 0) +
                (lunchPm?.recipe.nutrition.carbs || 0) +
                (dinnerPm?.recipe.nutrition.carbs || 0),
              fat:
                (breakfastPm?.recipe.nutrition.fat || 0) +
                (lunchPm?.recipe.nutrition.fat || 0) +
                (dinnerPm?.recipe.nutrition.fat || 0),
              fiber:
                (breakfastPm?.recipe.nutrition.fiber || 0) +
                (lunchPm?.recipe.nutrition.fiber || 0) +
                (dinnerPm?.recipe.nutrition.fiber || 0),
            },
          };
        });
        return { ...prev, days };
      });

      const allIngredients = new Set<string>();
      meals.forEach((meal) => {
        extractIngredientNames(meal.ingredients).forEach((name) => {
          if (name) allIngredients.add(name);
        });
      });

      setGroceryListItems(
        Array.from(allIngredients).map((name) => ({
          name,
          amount: "1",
          category: categorizeIngredient(name),
          estimatedPrice: 3.99,
        }))
      );
    };

    const loadOrGenerate = async () => {
      // Use built-in local dataset for stable variety (no API dependency).
      const meals: MealSuggestion[] = getDefaultMeals();
      if (meals.length) buildMealPlanFromSuggestions(meals);
    };

    void loadOrGenerate();
  }, [user?.user_id]);

  const weeklyNutrition = useMemo(() => {
    const days = mealPlan.days ?? [];
    if (days.length === 0) {
      return {
        totalMeals: 0,
        avgDailyCalories: 0,
        avgDailyProtein: 0,
        avgDailyFiber: 0,
        calorieProgress: 0,
        proteinProgress: 0,
        fiberProgress: 0,
      };
    }

    let totalCalories = 0;
    let totalProtein = 0;
    let totalFiber = 0;
    let totalMeals = 0;

    for (const day of days) {
      const dateKey = toDateKey(new Date(day.date));
      const actualForDay = actualMeals[dateKey] ?? {};
      const actualEntries = Object.values(actualForDay).filter(Boolean) as ActualMealEntry[];

      const plannedMealsForDay = [day.meals.breakfast, day.meals.lunch, day.meals.dinner].filter(
        Boolean
      ) as PlannedMeal[];

      if (actualEntries.length > 0) {
        totalCalories += actualEntries.reduce((sum, m) => sum + (m.calories_estimate || 0), 0);
        totalMeals += actualEntries.length;

        // Actual logs do not yet store protein/fiber, so fall back to planned for those.
        totalProtein += plannedMealsForDay.reduce((sum, m) => sum + (m.recipe.nutrition.protein || 0), 0);
        totalFiber += plannedMealsForDay.reduce((sum, m) => sum + (m.recipe.nutrition.fiber || 0), 0);
      } else {
        totalCalories += plannedMealsForDay.reduce((sum, m) => sum + (m.recipe.nutrition.calories || 0), 0);
        totalProtein += plannedMealsForDay.reduce((sum, m) => sum + (m.recipe.nutrition.protein || 0), 0);
        totalFiber += plannedMealsForDay.reduce((sum, m) => sum + (m.recipe.nutrition.fiber || 0), 0);
        totalMeals += plannedMealsForDay.length;
      }
    }

    const dayCount = days.length;
    const avgDailyCalories = Math.round(totalCalories / dayCount);
    const avgDailyProtein = Math.round(totalProtein / dayCount);
    const avgDailyFiber = Math.round(totalFiber / dayCount);

    const clamp = (n: number) => Math.max(0, Math.min(100, n));

    return {
      totalMeals,
      avgDailyCalories,
      avgDailyProtein,
      avgDailyFiber,
      calorieProgress: clamp((avgDailyCalories / 2000) * 100),
      proteinProgress: clamp((avgDailyProtein / 80) * 100),
      fiberProgress: clamp((avgDailyFiber / 25) * 100),
    };
  }, [mealPlan.days, actualMeals]);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <MahmLogo size="xl" />
          <p className="mt-4 text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="relative min-h-screen flex flex-col">
          <header className="p-6">
            <MahmLogo size="md" />
          </header>

          <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center">
            <div className="mb-8 animate-float">
              <MahmLogo size="xl" showText={false} />
            </div>

            <h1 className="font-display text-5xl md:text-7xl font-bold text-foreground mb-6">
              Like having a <span className="text-primary">mom</span>
              <br />
              who&apos;s also a <span className="text-accent">nutritionist</span>
            </h1>
            <p className="text-2xl md:text-3xl font-display text-muted-foreground mb-6">
              Make something your <span className="text-primary font-bold">mom</span> would be proud of
            </p>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10">
              Your AI nutritionist, meal planner, and grocery guru. Tell Mahm your dietary needs,
              budget, and cravings — she&apos;ll handle the rest.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => router.push("/onboarding")}
                className="gradient-coral text-white font-display font-bold text-xl px-10 py-7 rounded-xl shadow-warm hover:shadow-warm-lg transition-all"
              >
                Get Started Free
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowLoginModal(true)}
                className="border-2 border-primary text-primary font-display font-bold text-xl px-10 py-7 rounded-xl hover:bg-primary/10"
              >
                Log In
              </Button>
            </div>
          </main>

          <footer className="py-6 text-center border-t border-border/50">
            <p className="text-muted-foreground">
              Made with <span className="text-primary">♥</span> at TreeHacks 2026
            </p>
          </footer>
        </div>

        {/* Login Modal */}
        {showLoginModal && (
          <LoginModal
            onClose={() => setShowLoginModal(false)}
            onSuccess={() => setShowLoginModal(false)}
          />
        )}
      </div>
    );
  }

  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const apiMessages = [...messages, userMessage].map((m) => ({ role: m.role, content: m.content }));
      const { text, toolCalls, recipes } = await sendChatMessage(apiMessages);

      const assistantMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: text,
        timestamp: new Date(),
        toolCalls: (toolCalls ?? []).map((tc, i) => ({
          id: `tc${i + 1}`,
          name: tc.name as "search_recipes" | "get_nutrition" | "find_stores" | "generate_meal_plan",
          status: "complete" as const,
        })),
        recipes,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if ((toolCalls ?? []).some((tc) => tc.name === "search_recipes")) setShowRecipes(true);
      if ((toolCalls ?? []).some((tc) => tc.name === "find_stores")) setShowMarketplace(true);
      if ((toolCalls ?? []).some((tc) => tc.name === "generate_meal_plan")) setActiveTab("calendar");
    } catch (err) {
      const errorContent = err instanceof Error ? err.message : "Something went wrong. Is the Mahm chat server running?";
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Sorry, I couldn’t complete that: ${errorContent}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const getDefaultMealType = (): "breakfast" | "lunch" | "dinner" => {
    const hour = new Date().getHours();
    if (hour < 11) return "breakfast";
    if (hour < 16) return "lunch";
    return "dinner";
  };

  const getTodayDayIndex = () => {
    const today = new Date().toDateString();
    const idx = mealPlan.days.findIndex((d) => new Date(d.date).toDateString() === today);
    return idx >= 0 ? idx : 0;
  };

  const mapChatRecipeToPlannedMeal = (chatRecipe: ChatRecipeFromApi): PlannedMeal => {
    const recipe: Recipe = {
      id: chatRecipe.id,
      name: chatRecipe.name,
      description: "Added from chat recommendations",
      ingredients: (chatRecipe.ingredients ?? []).map((name) => ({
        name,
        amount: 1,
        unit: "",
      })),
      instructions: ["Open the recipe details for full instructions."],
      prepTime: 10,
      cookTime: chatRecipe.cook_time_min ?? 20,
      servings: 1,
      nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      dietaryTags: chatRecipe.dietary_tags ?? [],
      cuisine: "",
      difficulty: "easy",
      imageUrl: chatRecipe.image_link ?? undefined,
    };

    return { recipe, servings: 1 };
  };

  const handleAddToCalendar = (recipe: ChatRecipeFromApi) => {
    setAddToCalendarModal({
      recipe,
      dayIndex: getTodayDayIndex(),
      mealType: getDefaultMealType(),
    });
  };

  const handleConfirmAddToCalendar = () => {
    if (!addToCalendarModal) return;

    const { recipe, dayIndex, mealType } = addToCalendarModal;
    const plannedMeal = mapChatRecipeToPlannedMeal(recipe);

    setMealPlan((prev) => {
      if (dayIndex < 0 || dayIndex >= prev.days.length) return prev;

      const days = prev.days.map((day, idx) => {
        if (idx !== dayIndex) return day;

        const meals = { ...day.meals, [mealType]: plannedMeal };

        const mealList = [meals.breakfast, meals.lunch, meals.dinner].filter(Boolean) as PlannedMeal[];
        const dailyNutrition = {
          calories: mealList.reduce((s, m) => s + (m.recipe.nutrition.calories || 0), 0),
          protein: mealList.reduce((s, m) => s + (m.recipe.nutrition.protein || 0), 0),
          carbs: mealList.reduce((s, m) => s + (m.recipe.nutrition.carbs || 0), 0),
          fat: mealList.reduce((s, m) => s + (m.recipe.nutrition.fat || 0), 0),
          fiber: mealList.reduce((s, m) => s + (m.recipe.nutrition.fiber || 0), 0),
        };

        return { ...day, meals, dailyNutrition };
      });

      return { ...prev, days };
    });

    // Optionally add ingredients to grocery list
    if (recipe.ingredients?.length) {
      setGroceryListItems((prev) => {
        const seen = new Set(prev.map((i) => i.name.toLowerCase()));
        const additions = recipe.ingredients!
          .map((n) => n.trim())
          .filter((n) => n && !seen.has(n.toLowerCase()))
          .map((name) => ({
            name,
            amount: "1",
            category: categorizeIngredient(name),
            estimatedPrice: 3.99,
          }));

        return additions.length ? [...prev, ...additions] : prev;
      });
    }

    setAddToCalendarModal(null);
    setActiveTab("calendar");
  };


  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Compact Header */}
      <header className="gradient-hero border-b border-border/50 relative overflow-visible shrink-0 z-[120]">
        {/* Decorative blobs - smaller */}
        <div className="absolute top-0 left-0 w-20 h-20 bg-primary/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2" />

        <div className="max-w-6xl mx-auto px-4 py-3 relative">
          <div className="flex items-center justify-between">
            <div className="cursor-pointer" onClick={() => router.push("/")}>
              <MahmLogo size="md" />
            </div>
            <nav className="flex items-center gap-2 md:gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMealLogTarget(null);
                  setShowMealLog(true);
                }}
                className="text-muted-foreground hover:text-primary hover:bg-primary/10 font-semibold"
              >
                <span className="mr-1">📸</span>
                <span className="hidden sm:inline">Log Meal</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/saved")}
                className="text-muted-foreground hover:text-primary hover:bg-primary/10 font-semibold"
              >
                <span className="hidden sm:inline">My Recipes</span>
                <span className="sm:hidden text-lg">♥</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/profile")}
                className="text-muted-foreground hover:text-primary hover:bg-primary/10 font-semibold"
              >
                <span className="hidden sm:inline">Profile</span>
                <span className="sm:hidden text-lg">⚙</span>
              </Button>
              {user ? (
                <div className="relative z-[130]">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="w-9 h-9 rounded-full gradient-coral text-white flex items-center justify-center text-sm font-bold cursor-pointer shadow-playful hover:scale-105 transition-transform"
                  >
                    {(user.name || user.email || "U").charAt(0).toUpperCase()}
                  </button>
                  {showUserMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-[120]"
                        onClick={() => setShowUserMenu(false)}
                        aria-hidden="true"
                      />
                      <div className="absolute right-0 top-full mt-2 w-48 py-2 bg-white rounded-xl border-2 border-border shadow-lg z-[140]">
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            router.push("/profile");
                          }}
                          className="w-full px-4 py-2 text-left text-sm font-medium hover:bg-muted/50"
                        >
                          Profile
                        </button>
                        <button
                          onClick={async () => {
                            setShowUserMenu(false);
                            await logout();
                          }}
                          className="w-full px-4 py-2 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
                        >
                          Log out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Button
                  onClick={() => setShowLoginModal(true)}
                  size="sm"
                  className="gradient-coral text-white font-bold"
                >
                  Log in
                </Button>
              )}
            </nav>
          </div>

          {/* Compact tagline - only show on Chat tab when no messages */}
          {messages.length === 0 && activeTab === "chat" && (
            <div className="mt-4 mb-4 text-center">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
                <span className="text-primary">M</span>ade{" "}
                <span className="text-primary">A</span>t{" "}
                <span className="text-primary">H</span>ome...{" "}
                <span className="text-accent">M</span>mmm
              </h2>
              <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
                Make something your <span className="text-primary font-bold">mom</span> would be proud of.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <span className="px-3 py-1.5 bg-primary/15 rounded-full text-xs font-semibold text-primary">
                  Personalized nutrition
                </span>
                <span className="px-3 py-1.5 bg-accent/15 rounded-full text-xs font-semibold text-foreground">
                  Real local prices
                </span>
                <span className="px-3 py-1.5 bg-amber-400/20 rounded-full text-xs font-semibold text-foreground">
                  Weekly meal plans
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden max-w-6xl mx-auto w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="border-b border-border/50 px-4 bg-white/50">
            <TabsList className="bg-transparent h-auto p-0 gap-2 md:gap-6">
              <TabsTrigger
                value="chat"
                className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-3 data-[state=active]:border-primary rounded-none px-2 pb-3 pt-4 font-display font-bold text-base md:text-lg transition-all hover:text-primary"
              >
                Chat with Mahm
              </TabsTrigger>
              <TabsTrigger
                value="marketplace"
                className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-3 data-[state=active]:border-primary rounded-none px-2 pb-3 pt-4 font-display font-bold text-base md:text-lg transition-all hover:text-primary"
              >
                Marketplace
              </TabsTrigger>
              <TabsTrigger
                value="calendar"
                className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-3 data-[state=active]:border-primary rounded-none px-2 pb-3 pt-4 font-display font-bold text-base md:text-lg transition-all hover:text-primary"
              >
                Meal Calendar
              </TabsTrigger>
              <TabsTrigger
                value="photos"
                className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-3 data-[state=active]:border-primary rounded-none px-2 pb-3 pt-4 font-display font-bold text-base md:text-lg transition-all hover:text-primary"
              >
                Photo Log
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chat" className="flex-1 min-h-0 flex flex-col mt-0 data-[state=inactive]:hidden">
            <div className="flex-1 min-h-0 flex gap-4 p-4 overflow-hidden">
              <div className="flex-1 min-h-0 flex flex-col min-w-0">
                <div
                  ref={scrollRef}
                  className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
                >
                  <div className="pb-4">
                    {messages.map((message, index) => {
                      const currentDate = new Date(message.timestamp).toDateString();
                      const prevDate = index > 0 ? new Date(messages[index - 1].timestamp).toDateString() : null;
                      const showDateSeparator = index === 0 || currentDate !== prevDate;

                      return (
                        <div key={message.id}>
                          {showDateSeparator && <DateSeparator date={message.timestamp} />}
                          <ChatMessage message={message} onAddToCalendar={handleAddToCalendar} />
                        </div>
                      );
                    })}
                    {isTyping && <TypingIndicator />}
                  </div>
                </div>
                {/* Chat input fixed at bottom of chat area */}
                <div className="shrink-0 pt-2">
                  <ChatInput onSend={handleSendMessage} disabled={isTyping} />
                </div>
              </div>

              {showRecipes && (
                <div className="hidden lg:block w-80 shrink-0 overflow-y-auto">
                  <div className="sticky top-0 bg-background pb-2">
                    <h3 className="font-display font-bold text-foreground mb-3 flex items-center justify-between">
                      <span>Recommended for you</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/saved")}
                        className="text-primary text-xs font-bold"
                      >
                        View all
                      </Button>
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {dummyRecipes.map((recipe) => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        compact
                        onSelect={() => router.push(`/recipe/${recipe.id}`)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {showMarketplace && activeTab === "chat" && (
              <div className="shrink-0 px-4 pb-4">
                <GroceryComparison
                  comparisons={marketplaceComparisons}
                  groceryListItems={groceryListItems.map(item => item.name)}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="marketplace" className="flex-1 p-4 mt-0 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="font-display text-3xl font-bold text-foreground mb-2">Smart Marketplace</h2>
                <p className="text-muted-foreground">
                  Find the best prices for your ingredients at stores near you
                </p>
                {backendOk !== null && (
                  <p className="text-xs mt-1 text-muted-foreground">
                    {backendOk ? (
                      <span className="text-green-600">● Backend connected</span>
                    ) : (
                      <span className="text-amber-600">○ Backend unavailable — start backend (python run.py) for live prices</span>
                    )}
                  </p>
                )}
              </div>

              {/* Error from backend */}
              {marketplaceError && (
                <div className="mb-4 p-3 bg-destructive/10 rounded-xl border border-destructive/30 flex items-center gap-2">
                  <span className="text-lg">⚠</span>
                  <span className="text-sm font-medium text-foreground">{marketplaceError}</span>
                </div>
              )}

              {marketplaceLoading && (
                <div className="mb-4 p-6 bg-accent/10 rounded-xl border border-accent/30 text-center">
                  <div className="text-2xl mb-2 animate-pulse">🛒</div>
                  <p className="font-medium text-foreground">Fetching prices from Walmart and Target...</p>
                  <p className="text-sm text-muted-foreground mt-1">This may take a moment for each ingredient</p>
                </div>
              )}

              {!marketplaceLoading && marketplaceComparisons.length === 0 && !marketplaceError && (
                <div className="mb-4 p-8 bg-muted/30 rounded-xl border border-border/50 text-center">
                  <div className="text-4xl mb-3">🛒</div>
                  <p className="font-medium text-foreground">No price comparisons yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Add a recipe to your calendar from the chat to see Walmart and Target prices for each ingredient</p>
                </div>
              )}

              {marketplaceComparisons.length > 0 && (
                <GroceryComparison
                  comparisons={marketplaceComparisons}
                  groceryListItems={groceryListItems.map(item => item.name)}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="flex-1 p-4 mt-0 overflow-auto">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-3xl font-bold text-foreground mb-2">Your Meal Plan</h2>
                  <p className="text-muted-foreground">Planned suggestions + real meals you logged</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" className="border-2 border-primary text-primary hover:bg-primary/10 font-bold">
                    Sync to Calendar
                  </Button>
                  <Button className="gradient-coral text-white font-bold shadow-playful hover:scale-105 transition-transform">
                    Regenerate Plan
                  </Button>
                </div>
              </div>

              <MealCalendar
                mealPlan={mealPlan}
                actualMeals={actualMeals}
                onRequestLogMeal={({ dateKey, mealType }) => {
                  setMealLogTarget({ dateKey, mealType });
                  setShowMealLog(true);
                }}
                onRequestClearMeal={({ dateKey, mealType }) => clearActualMeal({ dateKey, mealType })}
              />

              <div className="grid md:grid-cols-2 gap-6">
                <GroceryList items={groceryListItems} totalCost={73} />

                <div className="bg-white rounded-2xl border-2 border-accent/30 p-4 shadow-playful-lime">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                      <span className="text-xl">🥗</span> Weekly Nutrition Summary
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNutritionDashboard(true)}
                      className="border-2 border-accent text-accent hover:bg-accent hover:text-white font-bold text-xs"
                    >
                      View Full Dashboard
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Avg. daily calories</span>
                      <span className="font-bold text-primary text-lg">
                        {weeklyNutrition.avgDailyCalories > 0 ? `${weeklyNutrition.avgDailyCalories.toLocaleString()} cal` : "No meals yet"}
                      </span>
                    </div>
                    <div className="w-full bg-primary/10 rounded-full h-3">
                      <div className="gradient-coral h-3 rounded-full transition-all" style={{ width: `${weeklyNutrition.calorieProgress}%` }} />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Avg. daily protein</span>
                      <span className="font-bold text-accent text-lg">
                        {weeklyNutrition.avgDailyProtein > 0 ? `${weeklyNutrition.avgDailyProtein}g` : "-"}
                      </span>
                    </div>
                    <div className="w-full bg-accent/10 rounded-full h-3">
                      <div className="gradient-lime h-3 rounded-full transition-all" style={{ width: `${weeklyNutrition.proteinProgress}%` }} />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Avg. daily fiber</span>
                      <span className="font-bold text-amber-500 text-lg">
                        {weeklyNutrition.avgDailyFiber > 0 ? `${weeklyNutrition.avgDailyFiber}g` : "-"}
                      </span>
                    </div>
                    <div className="w-full bg-amber-400/20 rounded-full h-3">
                      <div className="gradient-sunny h-3 rounded-full transition-all" style={{ width: `${weeklyNutrition.fiberProgress}%` }} />
                    </div>

                    <div className="pt-4 border-t-2 border-border/50">
                      {weeklyNutrition.totalMeals > 0 ? (
                        <>
                          <div className="flex items-center gap-2 text-sm font-medium text-accent">
                            <span className="text-lg">✓</span>
                            <span>{weeklyNutrition.totalMeals} meals planned this week</span>
                          </div>
                          {weeklyNutrition.avgDailyCalories > 0 && weeklyNutrition.avgDailyCalories < 2000 && (
                            <div className="flex items-center gap-2 text-sm font-medium text-accent mt-2">
                              <span className="text-lg">✓</span>
                              <span>On track for your calorie goals</span>
                            </div>
                          )}
                          {weeklyNutrition.avgDailyFiber >= 25 && (
                            <div className="flex items-center gap-2 text-sm font-medium text-accent mt-2">
                              <span className="text-lg">✓</span>
                              <span>High fiber for sustained energy</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground text-center py-2">
                          Add meals to your calendar to see nutrition insights
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="photos" className="flex-1 p-4 mt-0 overflow-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="mb-6">
                <h2 className="font-display text-3xl font-bold text-foreground mb-2">Photo Log</h2>
                <p className="text-muted-foreground">
                  Upload photos of your meals - we&apos;ll track the nutrition automatically!
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Card
                  className="p-6 border-2 border-primary/30 hover:border-primary transition-colors cursor-pointer group"
                  onClick={() => {
                    setMealLogTarget(null);
                    setShowMealLog(true);
                  }}
                >
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full gradient-coral flex items-center justify-center text-4xl shadow-playful group-hover:scale-110 transition-transform">
                      📸
                    </div>
                    <h3 className="font-display font-bold text-xl text-foreground mb-2">Log a Meal</h3>
                    <p className="text-muted-foreground text-sm">Snap a photo - we&apos;ll estimate the nutrition!</p>
                  </div>
                </Card>

              </div>

              <div className="mt-8">
                <h3 className="font-display font-bold text-xl text-foreground mb-4">Recent Meal Photos</h3>

                {recentMeals.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No photos yet — log your first meal 📸</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {recentMeals.map((m) => (
                      <Card key={m.id} className="aspect-square overflow-hidden group cursor-pointer" onClick={() => setSelectedMeal(m)}>
                        <div className="w-full h-full relative">
                          <img src={m.imageUrl} alt={m.dish_name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                          <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-white/90 rounded-lg p-2 text-center">
                              <div className="text-xs font-bold text-primary">~{m.calories_estimate} cal</div>
                              <div className="text-xs text-muted-foreground">tap to view</div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {showMealLog && (
        <MealLogModal
          onClose={() => setShowMealLog(false)}
          defaultTarget={mealLogTarget}
          onAnalyzed={({ file, target, result }) => {
            addRecentMeal(file, result);
            upsertActualMeal({ file, target, result });
          }}
        />
      )}


      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => setShowLoginModal(false)}
        />
      )}

      {/* Add to Meal Calendar Modal */}
      {addToCalendarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-foreground">Add to meal calendar</h2>
              <button
                onClick={() => setAddToCalendarModal(null)}
                className="text-muted-foreground hover:text-foreground text-2xl"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{addToCalendarModal.recipe.name}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Day</label>
                <select
                  className="w-full p-2 border-2 border-border rounded-xl"
                  value={addToCalendarModal.dayIndex}
                  onChange={(e) =>
                    setAddToCalendarModal((prev) =>
                      prev ? { ...prev, dayIndex: Number(e.target.value) } : null
                    )
                  }
                >
                  {mealPlan.days.map((day, i) => (
                    <option key={i} value={i}>
                      {day.date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Meal</label>
                <select
                  className="w-full p-2 border-2 border-border rounded-xl"
                  value={addToCalendarModal.mealType}
                  onChange={(e) =>
                    setAddToCalendarModal((prev) =>
                      prev ? { ...prev, mealType: e.target.value as "breakfast" | "lunch" | "dinner" } : null
                    )
                  }
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setAddToCalendarModal(null)}>
                Cancel
              </Button>
              <Button className="flex-1 gradient-coral text-white font-bold" onClick={handleConfirmAddToCalendar}>
                Add to calendar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Nutrition Dashboard Modal */}
      {showNutritionDashboard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                <span>📊</span> Nutrition Dashboard
              </h2>
              <button onClick={() => setShowNutritionDashboard(false)} className="text-muted-foreground hover:text-foreground text-2xl">
                ×
              </button>
            </div>

            <NutritionDashboard
              todayCalories={1420}
              todayProtein={48}
              todayCarbs={165}
              todayFat={52}
              todayFiber={28}
              targetCalories={2000}
              targetProtein={80}
              weeklyAvg={{ calories: 1395, protein: 52, carbs: 170, fat: 48 }}
              mealsLogged={3}
              streak={5}
              goals={["weight-loss", "muscle", "save-money"]}
            />

            <div className="mt-4 pt-4 border-t border-border/50">
              <Button variant="outline" onClick={() => setShowNutritionDashboard(false)} className="w-full border-2">
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      <footer className="border-t border-border/50 py-4 px-4 text-center bg-background/50">
        <p className="text-sm text-muted-foreground">
          Made with <span className="text-primary">♥</span> at TreeHacks 2026 |{" "}
          <span className="font-display font-bold text-foreground">Mahm</span> — Make something your Mahm would be proud of
        </p>
      </footer>

      {selectedMeal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMeal(null)}>
          <Card className="w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-display font-bold text-foreground">Meal Details</div>
              <button className="text-muted-foreground hover:text-foreground text-2xl" onClick={() => setSelectedMeal(null)}>
                ×
              </button>
            </div>
            <img src={selectedMeal.imageUrl} className="w-full h-56 object-cover rounded-xl" alt={selectedMeal.dish_name} />
            <div className="mt-3 text-sm">
              <div><span className="font-medium">Dish:</span> {selectedMeal.dish_name}</div>
              <div><span className="font-medium">Calories:</span> {selectedMeal.calories_estimate} kcal</div>
              <div><span className="font-medium">Confidence:</span> {selectedMeal.confidence}</div>
              <div className="mt-2 text-muted-foreground">{selectedMeal.notes}</div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-6xl mb-4">🍳</div>
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

