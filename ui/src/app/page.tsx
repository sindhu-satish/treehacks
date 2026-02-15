"use client";

import { useState, useRef, useEffect, useMemo, Suspense } from "react";
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
import { MealCalendar } from "@/components/calendar/MealCalendar";
import { GroceryList } from "@/components/calendar/GroceryList";
import { MahmLogo, MahmLogoFull } from "@/components/brand/MahmLogo";
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
import { healthCheck, sendChatMessage, comparePrices, getProfile, estimateNutrition, extractRecipe, type MealSuggestion, type ExtractedRecipe } from "@/lib/api";
import {
  ChatMessage as ChatMessageType,
  GroceryComparison as GroceryComparisonType,
  MealPlan,
  MealDay,
  PlannedMeal,
  Recipe,
  ChatRecipeFromApi,
} from "@/types";

// Recipe from Photo Modal Component
function RecipeFromPhotoModal({ onClose, onRecipeGenerated }: { onClose: () => void; onRecipeGenerated: (recipeId: string) => void }) {
  const [hasPhoto, setHasPhoto] = useState(false);
  const [restaurantName, setRestaurantName] = useState("");
  const [dishName, setDishName] = useState("");
  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedRecipe, setGeneratedRecipe] = useState<ExtractedRecipe | null>(null);

  const handleGenerate = async () => {
    if (!dishName.trim()) {
      setGenerateError("Please enter a dish name");
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);

    try {
      // Call the real OpenAI-powered API
      const recipe = await extractRecipe(dishName, restaurantName, notes);
      setGeneratedRecipe(recipe);
    } catch (error) {
      console.error("Recipe generation failed:", error);
      setGenerateError("Failed to generate recipe. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveRecipe = () => {
    // In a real app, this would save to the database
    // For now, redirect to a recipe page
    onRecipeGenerated("generated-1");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        {!generatedRecipe ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-bold text-foreground">
                {isGenerating ? "Generating Recipe..." : "Extract Recipe"}
              </h2>
              {!isGenerating && (
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl">
                  ×
                </button>
              )}
            </div>

            {isGenerating ? (
              <div className="py-12 text-center">
                <div className="text-6xl mb-6 animate-bounce">🍳</div>
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                    <span className="text-muted-foreground">Analyzing photo...</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                    <span className="text-muted-foreground">Identifying ingredients...</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                    <span className="text-muted-foreground">Creating recipe steps...</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-6">
                  Our AI is working its magic!
                </p>
              </div>
            ) : (
              <>
                {/* Photo Upload */}
                <div
                  onClick={() => setHasPhoto(true)}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center mb-4 cursor-pointer transition-all ${
                    hasPhoto
                      ? "border-accent bg-accent/10"
                      : "border-accent/30 hover:border-accent hover:bg-accent/5"
                  }`}
                >
                  {hasPhoto ? (
                    <>
                      <div className="text-5xl mb-2">✓</div>
                      <p className="font-bold text-accent">Photo uploaded!</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setHasPhoto(false);
                        }}
                        className="text-xs text-muted-foreground hover:text-primary mt-2"
                      >
                        Remove photo
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-5xl mb-3 animate-float">📸</div>
                      <p className="font-bold text-foreground mb-1">Upload a photo of a dish</p>
                      <p className="text-sm text-muted-foreground">We&apos;ll create a recipe you can make at home!</p>
                    </>
                  )}
                </div>

                {/* Where did you have it? */}
                <div className="mb-4">
                  <label className="font-bold text-foreground mb-2 block">Where did you have this?</label>
                  <input
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="Restaurant name (optional)"
                    className="w-full p-3 border-2 border-border rounded-xl focus:outline-none focus:border-accent transition-colors"
                  />
                </div>

                {/* Dish name if known */}
                <div className="mb-4">
                  <label className="font-bold text-foreground mb-2 block">Dish name (if you know it)</label>
                  <input
                    type="text"
                    value={dishName}
                    onChange={(e) => setDishName(e.target.value)}
                    placeholder="E.g., Pad Thai, Caesar Salad..."
                    className="w-full p-3 border-2 border-border rounded-xl focus:outline-none focus:border-accent transition-colors"
                  />
                </div>

                {/* Notes */}
                <div className="mb-6">
                  <label className="font-bold text-foreground mb-2 block">Any notes about the dish?</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="E.g., It was creamy, had lots of garlic, tasted smoky..."
                    className="w-full p-3 border-2 border-border rounded-xl resize-none h-20 focus:outline-none focus:border-accent transition-colors"
                  />
                </div>

                {generateError && (
                  <p className="text-sm text-center text-destructive mb-3 p-2 bg-destructive/10 rounded-lg">
                    {generateError}
                  </p>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={!dishName.trim()}
                  className="w-full gradient-lime text-white font-bold text-lg py-6 shadow-playful-lime hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  Generate Recipe
                </Button>

                {!dishName.trim() && (
                  <p className="text-xs text-center text-muted-foreground mt-3">
                    Enter a dish name to generate a recipe
                  </p>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {/* Generated Recipe View */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-bold text-foreground">Recipe Generated!</h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl">
                ×
              </button>
            </div>

            <div className="mb-4 p-4 bg-accent/10 rounded-2xl border-2 border-accent/30">
              <div className="text-center mb-2">
                <span className="text-4xl">🎉</span>
              </div>
              <h3 className="font-display text-xl font-bold text-foreground text-center mb-2">
                {generatedRecipe.name}
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                {generatedRecipe.description}
              </p>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <div className="text-lg">⏱️</div>
                <div className="text-xs text-muted-foreground">Prep</div>
                <div className="font-bold text-foreground">{generatedRecipe.prepTime}m</div>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <div className="text-lg">🍳</div>
                <div className="text-xs text-muted-foreground">Cook</div>
                <div className="font-bold text-foreground">{generatedRecipe.cookTime}m</div>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <div className="text-lg">👥</div>
                <div className="text-xs text-muted-foreground">Serves</div>
                <div className="font-bold text-foreground">{generatedRecipe.servings}</div>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <div className="text-lg">🔥</div>
                <div className="text-xs text-muted-foreground">Cal</div>
                <div className="font-bold text-primary">{generatedRecipe.calories}</div>
              </div>
            </div>

            {/* Ingredients preview */}
            <div className="mb-4">
              <h4 className="font-bold text-foreground mb-2">Ingredients ({generatedRecipe.ingredients.length})</h4>
              <div className="bg-muted/20 rounded-xl p-3 max-h-32 overflow-y-auto">
                <ul className="text-sm space-y-1">
                  {generatedRecipe.ingredients.map((ing, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Instructions preview */}
            <div className="mb-6">
              <h4 className="font-bold text-foreground mb-2">Instructions ({generatedRecipe.instructions.length} steps)</h4>
              <div className="bg-muted/20 rounded-xl p-3 max-h-32 overflow-y-auto">
                <ol className="text-sm space-y-2">
                  {generatedRecipe.instructions.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-bold text-primary shrink-0">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setGeneratedRecipe(null)}
                className="flex-1 border-2"
              >
                Try Again
              </Button>
              <Button
                onClick={handleSaveRecipe}
                className="flex-1 gradient-lime text-white font-bold"
              >
                Save & View Recipe
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// Meal Log Modal Component
function MealLogModal({ onClose, plannedMeals }: { onClose: () => void; plannedMeals: Array<{ name: string; mealType: string }> }) {
  const [mealPlanStatus, setMealPlanStatus] = useState<"planned" | "unplanned" | null>(null);
  const [mealType, setMealType] = useState<string | null>(null);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<{ name: string; mealType: string } | null>(null);
  const [portionSize, setPortionSize] = useState<string>("Regular");
  const [isLogging, setIsLogging] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);

  // Auto-set meal type when a planned meal is selected
  const handleSelectPlannedMeal = (meal: { name: string; mealType: string }) => {
    setSelectedMeal(meal);
    // Auto-detect meal type from the planned meal
    const typeMap: Record<string, string> = {
      breakfast: "Breakfast",
      lunch: "Lunch",
      dinner: "Dinner",
      snack: "Snack",
    };
    setMealType(typeMap[meal.mealType] || null);
  };

  const handleLogMeal = async () => {
    setIsLogging(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLogging(false);
    setLogSuccess(true);
    // Close after showing success
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  // Determine if meal type is auto-detected (for planned meals)
  const isMealTypeAutoDetected = mealPlanStatus === "planned" && selectedMeal !== null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-bold text-foreground">Log a Meal</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl">
            ×
          </button>
        </div>

        {/* Step 1: Was this on your meal plan? */}
        <div className="mb-5">
          <label className="font-bold text-foreground mb-3 block text-lg">Was this on your meal plan?</label>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setMealPlanStatus("planned");
                setSelectedMeal(null);
                setMealType(null);
              }}
              className={`flex-1 px-4 py-4 rounded-xl text-sm font-bold transition-all ${
                mealPlanStatus === "planned"
                  ? "bg-accent text-white shadow-playful-lime scale-105"
                  : "bg-accent/10 text-foreground hover:bg-accent/20 border-2 border-accent/30"
              }`}
            >
              <span className="text-2xl block mb-1">✓</span>
              Yes, planned meal
            </button>
            <button
              onClick={() => {
                setMealPlanStatus("unplanned");
                setSelectedMeal(null);
                setMealType(null);
              }}
              className={`flex-1 px-4 py-4 rounded-xl text-sm font-bold transition-all ${
                mealPlanStatus === "unplanned"
                  ? "bg-amber-400 text-foreground shadow-playful-sunny scale-105"
                  : "bg-amber-400/10 text-foreground hover:bg-amber-400/20 border-2 border-sunny/30"
              }`}
            >
              <span className="text-2xl block mb-1">🍽️</span>
              No, unplanned
            </button>
          </div>
        </div>

        {/* Step 2 for PLANNED: Select your planned meal (moved up!) */}
        {mealPlanStatus === "planned" && (
          <div className="mb-5 p-4 bg-accent/5 rounded-xl border-2 border-accent/20">
            <label className="font-bold text-foreground mb-2 block text-sm">Select your planned meal</label>
            <div className="space-y-2">
              {plannedMeals.length > 0 ? (
                plannedMeals.map((meal) => (
                  <button
                    key={`${meal.name}-${meal.mealType}`}
                    onClick={() => handleSelectPlannedMeal(meal)}
                    className={`w-full p-3 rounded-lg text-left text-sm font-medium transition-all ${
                      selectedMeal?.name === meal.name && selectedMeal?.mealType === meal.mealType
                        ? "bg-accent/20 border-2 border-accent text-foreground"
                        : "bg-white hover:bg-accent/10 border-2 border-transparent hover:border-accent/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        {selectedMeal?.name === meal.name && selectedMeal?.mealType === meal.mealType && <span className="mr-2">✓</span>}
                        {meal.name}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">{meal.mealType}</span>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No meals planned for today</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2 for UNPLANNED / Step 3 for PLANNED: Meal Type */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="font-bold text-foreground">Meal type</label>
            {isMealTypeAutoDetected && (
              <span className="text-xs text-accent font-medium">Auto-detected from plan</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { type: "Breakfast", icon: "🌅" },
              { type: "Lunch", icon: "☀️" },
              { type: "Dinner", icon: "🌙" },
              { type: "Snack", icon: "🍎" },
            ].map(({ type, icon }) => (
              <button
                key={type}
                onClick={() => setMealType(type)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  mealType === type
                    ? "bg-primary text-white"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                }`}
              >
                {icon} {type}
              </button>
            ))}
          </div>
          {mealPlanStatus === "planned" && (
            <p className="text-xs text-muted-foreground mt-2">
              {isMealTypeAutoDetected
                ? "You can change this if needed"
                : "Select a meal above to auto-detect, or choose manually"}
            </p>
          )}
        </div>

        {/* Photo Upload - Required for unplanned, optional for planned */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="font-bold text-foreground">
              Photo of your meal
              {mealPlanStatus === "planned" && (
                <span className="text-muted-foreground font-normal text-sm ml-2">(optional)</span>
              )}
            </label>
            {mealPlanStatus === "planned" && hasPhoto && (
              <button
                onClick={() => setHasPhoto(false)}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                Remove
              </button>
            )}
          </div>

          {!hasPhoto ? (
            <div
              onClick={() => setHasPhoto(true)}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
                mealPlanStatus === "unplanned"
                  ? "border-primary/50 hover:border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <div className="text-4xl mb-2">📷</div>
              <p className="font-bold text-foreground mb-1">Tap to upload a photo</p>
              <p className="text-xs text-muted-foreground">
                {mealPlanStatus === "unplanned"
                  ? "Required for nutrition analysis"
                  : "Optional - we already know your planned meal!"}
              </p>
            </div>
          ) : (
            <div className="bg-accent/10 border-2 border-accent rounded-2xl p-4 text-center">
              <div className="text-4xl mb-2">✓</div>
              <p className="font-bold text-accent">Photo uploaded!</p>
            </div>
          )}
        </div>

        {/* If unplanned - description field */}
        {mealPlanStatus === "unplanned" && (
          <>
            <div className="mb-4">
              <label className="font-bold text-foreground mb-2 block">Where did you eat?</label>
              <input
                type="text"
                placeholder="Restaurant name or 'home-cooked'..."
                className="w-full p-3 border-2 border-border rounded-xl focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="mb-4">
              <label className="font-bold text-foreground mb-2 block">What did you eat?</label>
              <textarea
                placeholder="E.g., Chicken salad with avocado, grilled salmon..."
                className="w-full p-3 border-2 border-border rounded-xl resize-none h-20 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </>
        )}

        {/* Portion Size */}
        <div className="mb-6">
          <label className="font-bold text-foreground mb-2 block">Portion size</label>
          <div className="flex gap-2">
            {["Small", "Regular", "Large", "XL"].map((size) => (
              <button
                key={size}
                onClick={() => setPortionSize(size)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  portionSize === size
                    ? "bg-primary text-white"
                    : "bg-muted/50 text-foreground hover:bg-primary/20"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleLogMeal}
          className={`w-full font-bold text-lg py-6 shadow-playful transition-transform ${
            logSuccess
              ? "bg-accent hover:bg-accent text-white"
              : "gradient-coral text-white hover:scale-105"
          }`}
          disabled={
            isLogging ||
            logSuccess ||
            !mealPlanStatus ||
            !mealType ||
            (mealPlanStatus === "planned" && !selectedMeal) ||
            (mealPlanStatus === "unplanned" && !hasPhoto)
          }
        >
          {isLogging ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span> Logging...
            </span>
          ) : logSuccess ? (
            <span className="flex items-center justify-center gap-2">
              <span>✓</span> Meal Logged!
            </span>
          ) : (
            mealPlanStatus === "planned" ? "Log Meal" : "Analyze Meal"
          )}
        </Button>

        {mealPlanStatus === "unplanned" && !hasPhoto && (
          <p className="text-xs text-center text-primary mt-2">
            Photo required for unplanned meals to estimate nutrition
          </p>
        )}
        {mealPlanStatus === "planned" && !selectedMeal && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            Please select a meal from your plan
          </p>
        )}
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
  const [showRecipeFromPhoto, setShowRecipeFromPhoto] = useState(false);
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

  const handleAddToCalendar = (recipe: ChatRecipeFromApi) => {
    setAddToCalendarModal({
      recipe,
      dayIndex: 0,
      mealType: "dinner",
    });
  };

  const handleConfirmAddToCalendar = async () => {
    if (!addToCalendarModal) return;
    const { recipe, dayIndex, mealType } = addToCalendarModal;
    const ingredients = extractIngredientNames(recipe.ingredients);
    if (ingredients.length === 0) {
      setAddToCalendarModal(null);
      setActiveTab("calendar");
      return;
    }

    setMarketplaceLoading(true);
    const minimalRecipe: Recipe = {
      id: recipe.id,
      name: recipe.name,
      description: "",
      ingredients: ingredients.map((name) => ({ name, amount: 0, unit: "" })),
      instructions: [],
      prepTime: 0,
      cookTime: recipe.cook_time_min ?? 0,
      servings: 1,
      nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      dietaryTags: recipe.dietary_tags ?? [],
      cuisine: "",
      difficulty: "easy",
    };
    const plannedMeal: PlannedMeal = { recipe: minimalRecipe, servings: 1 };
    setMealPlan((prev) => {
      const days = prev.days.map((d, i) =>
        i === dayIndex
          ? { ...d, meals: { ...d.meals, [mealType]: plannedMeal } }
          : d
      );
      return { ...prev, days };
    });
    setGroceryListItems(ingredients.map((name) => ({ name, amount: "1", category: "other", estimatedPrice: 0 })));
    setAddToCalendarModal(null);
    setActiveTab("marketplace");

    let zip = "94305";
    if (user?.user_id) {
      try {
        const profile = await getProfile(user.user_id);
        if (profile.zip?.trim()) zip = profile.zip.trim();
      } catch {
        /* use default */
      }
    }
    try {
      const comparisons = await comparePrices(zip, ingredients);
      setMarketplaceComparisons(comparisons);
    } catch (e) {
      setMarketplaceError(e instanceof Error ? e.message : "Could not load prices");
      setMarketplaceComparisons([]);
    } finally {
      setMarketplaceLoading(false);
    }
  };

  // Calculate weekly nutrition summary from meal plan
  const weeklyNutrition = useMemo(() => {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalFiber = 0;
    let mealCount = 0;

    mealPlan.days.forEach((day) => {
      const meals = [day.meals.breakfast, day.meals.lunch, day.meals.dinner].filter(Boolean);
      meals.forEach((meal) => {
        if (meal?.recipe?.nutrition) {
          totalCalories += meal.recipe.nutrition.calories || 0;
          totalProtein += meal.recipe.nutrition.protein || 0;
          totalCarbs += meal.recipe.nutrition.carbs || 0;
          totalFat += meal.recipe.nutrition.fat || 0;
          totalFiber += meal.recipe.nutrition.fiber || 0;
          mealCount++;
        }
      });
    });

    const daysWithMeals = mealPlan.days.filter(
      (d) => d.meals.breakfast || d.meals.lunch || d.meals.dinner
    ).length || 1;

    return {
      avgDailyCalories: Math.round(totalCalories / daysWithMeals),
      avgDailyProtein: Math.round(totalProtein / daysWithMeals),
      avgDailyCarbs: Math.round(totalCarbs / daysWithMeals),
      avgDailyFat: Math.round(totalFat / daysWithMeals),
      avgDailyFiber: Math.round(totalFiber / daysWithMeals),
      totalMeals: mealCount,
      calorieProgress: Math.min(100, Math.round((totalCalories / daysWithMeals / 2000) * 100)),
      proteinProgress: Math.min(100, Math.round((totalProtein / daysWithMeals / 60) * 100)),
      fiberProgress: Math.min(100, Math.round((totalFiber / daysWithMeals / 30) * 100)),
    };
  }, [mealPlan]);

  useEffect(() => {
    healthCheck().then(setBackendOk);
  }, []);

  // Load generated meals from localStorage and populate calendar + grocery list
  useEffect(() => {
    const loadGeneratedMeals = async () => {
      const storedMeals = localStorage.getItem("mahm_generated_meals");
      if (!storedMeals) return;

      try {
        const meals: MealSuggestion[] = JSON.parse(storedMeals);
        if (!Array.isArray(meals) || meals.length === 0) return;

        // Group meals by type
        const breakfasts = meals.filter((m) => m.mealType === "breakfast");
        const lunches = meals.filter((m) => m.mealType === "lunch");
        const dinners = meals.filter((m) => m.mealType === "dinner");

        // Collect all unique ingredients for grocery list
        const allIngredients = new Set<string>();
        meals.forEach((meal) => {
          meal.ingredients?.forEach((ing) => {
            // Extract just the ingredient name (remove amounts like "1 cup", "2 tbsp")
            const cleanName = ing.replace(/^[\d\s\/½¼¾⅓⅔]+\s*(cup|tbsp|tsp|oz|lb|g|kg|ml|l|cloves?|inch|can|block|head|bunch)s?\s*/i, "").trim();
            if (cleanName) allIngredients.add(cleanName);
          });
        });

        // Populate grocery list
        const groceryItems = Array.from(allIngredients).map((name) => ({
          name,
          amount: "1",
          category: categorizeIngredient(name),
          estimatedPrice: 3 + Math.random() * 5, // Placeholder price
        }));
        setGroceryListItems(groceryItems);

        // Populate the meal plan
        setMealPlan((prev) => {
          const newDays = prev.days.map((day, idx) => {
            const breakfast = breakfasts[idx % breakfasts.length];
            const lunch = lunches[idx % lunches.length];
            const dinner = dinners[idx % dinners.length];

            const toPlannedMeal = (meal: MealSuggestion | undefined): PlannedMeal | undefined => {
              if (!meal) return undefined;
              const recipe: Recipe = {
                id: meal.id,
                name: meal.name,
                description: meal.description,
                ingredients: meal.ingredients.map((name) => ({ name, amount: 1, unit: "" })),
                instructions: meal.instructions,
                prepTime: meal.prepTime,
                cookTime: meal.cookTime,
                servings: meal.servings,
                nutrition: meal.nutrition,
                dietaryTags: meal.dietaryTags,
                cuisine: "",
                difficulty: "easy",
              };
              return { recipe, servings: meal.servings };
            };

            const dailyNutrition = {
              calories: (breakfast?.nutrition.calories || 0) + (lunch?.nutrition.calories || 0) + (dinner?.nutrition.calories || 0),
              protein: (breakfast?.nutrition.protein || 0) + (lunch?.nutrition.protein || 0) + (dinner?.nutrition.protein || 0),
              carbs: (breakfast?.nutrition.carbs || 0) + (lunch?.nutrition.carbs || 0) + (dinner?.nutrition.carbs || 0),
              fat: (breakfast?.nutrition.fat || 0) + (lunch?.nutrition.fat || 0) + (dinner?.nutrition.fat || 0),
              fiber: (breakfast?.nutrition.fiber || 0) + (lunch?.nutrition.fiber || 0) + (dinner?.nutrition.fiber || 0),
            };

            return {
              ...day,
              meals: {
                breakfast: toPlannedMeal(breakfast),
                lunch: toPlannedMeal(lunch),
                dinner: toPlannedMeal(dinner),
              },
              dailyNutrition,
            };
          });

          return { ...prev, days: newDays };
        });

        // Fetch marketplace prices in background
        const ingredientNames = Array.from(allIngredients).slice(0, 10); // Limit to first 10 for performance
        if (ingredientNames.length > 0) {
          let zip = "94305";
          if (user?.user_id) {
            try {
              const profile = await getProfile(user.user_id);
              if (profile.zip?.trim()) zip = profile.zip.trim();
            } catch {
              /* use default */
            }
          }
          try {
            const comparisons = await comparePrices(zip, ingredientNames);
            setMarketplaceComparisons(comparisons);
          } catch {
            // Marketplace fetch failed, will show empty
          }
        }

        // Optionally fetch updated nutrition from OpenAI for any meals missing nutrition
        for (const meal of meals) {
          if (!meal.nutrition || meal.nutrition.calories === 0) {
            try {
              const nutrition = await estimateNutrition(meal.name, meal.ingredients);
              meal.nutrition = nutrition;
            } catch {
              // Keep existing nutrition
            }
          }
        }
        // Update localStorage with enhanced data
        localStorage.setItem("mahm_generated_meals", JSON.stringify(meals));
      } catch {
        console.warn("Failed to load generated meals");
      }
    };

    loadGeneratedMeals();
  }, [user]);

  // Add welcome message for logged in users
  useEffect(() => {
    if (user && messages.length === 0) {
      const storedMeals = localStorage.getItem("mahm_generated_meals");
      const userProfile = localStorage.getItem("mahm_user_profile");

      let welcomeText = `Hey ${user.name || "there"}! 👋 I'm **Mahm** — your AI nutritionist, meal planner, and grocery guru!\n\n` +
        `I'm here to help you make delicious, healthy meals that would make your mom proud. Here's what I can do:\n\n` +
        `🍳 **Find recipes** — "What can I make with chicken and rice?"\n` +
        `🥗 **Get nutrition info** — "How many calories in a Caesar salad?"\n` +
        `📅 **Plan your week** — "Create a meal plan for this week"\n` +
        `🛒 **Compare prices** — "Find the cheapest groceries near me"\n\n` +
        `**Try asking me something!** What are you in the mood for today?`;

      if (storedMeals && userProfile) {
        try {
          const meals: MealSuggestion[] = JSON.parse(storedMeals);
          const profile = JSON.parse(userProfile);
          const mealCount = meals.length;
          const avgCalories = Math.round(meals.reduce((sum, m) => sum + (m.nutrition?.calories || 0), 0) / mealCount);

          welcomeText = `Hey ${user.name || profile.name || "there"}! 👋 Welcome back to **Mahm**!\n\n` +
            `I've got your personalized meal plan ready:\n\n` +
            `📅 **${mealCount} meals** planned for the week\n` +
            `🔥 **~${avgCalories} cal** per meal on average\n` +
            `💰 Optimized for your **$${profile.budget || 100}/week** budget\n\n` +
            `Check out your **Meal Calendar** tab, or ask me anything!\n\n` +
            `**Quick actions:**\n` +
            `• "Show me healthy dinner ideas"\n` +
            `• "What's a good high-protein breakfast?"\n` +
            `• "Find me a recipe under 30 minutes"`;
        } catch {
          // Use default welcome
        }
      }

      setMessages([
        {
          id: "welcome-1",
          role: "assistant",
          content: welcomeText,
          timestamp: new Date(),
        },
      ]);
    }
  }, [user, messages.length]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

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
        {/* Warm background elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl translate-x-1/2" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-amber-400/15 rounded-full blur-3xl translate-y-1/2" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-accent-light/30 rounded-full blur-3xl" />

        <div className="relative min-h-screen flex flex-col">
          {/* Header */}
          <header className="p-6">
            <MahmLogo size="md" />
          </header>

          {/* Main Content */}
          <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center">
            <div className="mb-8 animate-float">
              <MahmLogo size="xl" showText={false} />
            </div>

            <h1 className="font-display text-5xl md:text-7xl font-bold text-foreground mb-4">
              <span className="text-primary">M</span>ade{" "}
              <span className="text-primary">A</span>t{" "}
              <span className="text-primary">H</span>ome...{" "}
              <span className="text-accent">M</span>mmm
            </h1>
            <p className="text-2xl md:text-3xl font-display text-muted-foreground mb-6">
              Make something your <span className="text-primary font-bold">mom</span> would be proud of
            </p>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10">
              Your AI nutritionist, meal planner, and grocery guru. Tell Mahm your dietary needs,
              budget, and cravings — she&apos;ll handle the rest.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <div className="px-6 py-3 bg-primary/15 rounded-full font-semibold text-primary shadow-warm">
                Personalized nutrition
              </div>
              <div className="px-6 py-3 bg-accent/15 rounded-full font-semibold text-foreground shadow-warm">
                Real local prices
              </div>
              <div className="px-6 py-3 bg-amber-400/20 rounded-full font-semibold text-foreground shadow-warm">
                Weekly meal plans
              </div>
            </div>

            {/* CTA Buttons */}
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

          {/* Features Section */}
          <section className="px-4 py-16 bg-background/50">
            <div className="max-w-5xl mx-auto">
              <h2 className="font-display text-3xl font-bold text-foreground text-center mb-12">
                Everything you need to eat well
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                <Card className="p-6 border border-primary/20 shadow-warm text-center card-hover">
                  <div className="text-5xl mb-4">💬</div>
                  <h3 className="font-display font-bold text-xl text-foreground mb-2">Chat with Mahm</h3>
                  <p className="text-muted-foreground">
                    Get personalized meal recommendations based on your preferences, goals, and what&apos;s in your fridge.
                  </p>
                </Card>
                <Card className="p-6 border border-accent/30 shadow-warm text-center card-hover">
                  <div className="text-5xl mb-4">🛒</div>
                  <h3 className="font-display font-bold text-xl text-foreground mb-2">Smart Marketplace</h3>
                  <p className="text-muted-foreground">
                    Compare prices across local stores and find the best deals for your grocery list.
                  </p>
                </Card>
                <Card className="p-6 border border-amber-400/30 shadow-warm text-center card-hover">
                  <div className="text-5xl mb-4">📅</div>
                  <h3 className="font-display font-bold text-xl text-foreground mb-2">Meal Calendar</h3>
                  <p className="text-muted-foreground">
                    Plan your whole week with auto-generated grocery lists and nutrition tracking.
                  </p>
                </Card>
              </div>
            </div>
          </section>

          {/* Footer */}
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

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Compact Header */}
      <header className="gradient-hero border-b border-border/50 relative overflow-hidden shrink-0">
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
                onClick={() => setShowMealLog(true)}
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
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="w-9 h-9 rounded-full gradient-coral text-white flex items-center justify-center text-sm font-bold cursor-pointer shadow-playful hover:scale-105 transition-transform"
                  >
                    {(user.name || user.email || "U").charAt(0).toUpperCase()}
                  </button>
                  {showUserMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowUserMenu(false)}
                        aria-hidden="true"
                      />
                      <div className="absolute right-0 top-full mt-2 w-48 py-2 bg-white rounded-xl border-2 border-border shadow-lg z-50">
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

          {/* Chat Tab */}
          <TabsContent value="chat" className="flex-1 flex flex-col mt-0 min-h-0 overflow-hidden data-[state=inactive]:hidden">
            <div className="flex-1 flex gap-4 p-4 min-h-0 overflow-hidden">
              {/* Chat Messages */}
              <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
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

              {/* Side Panel - Recipes */}
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

            {/* Inline Marketplace Results */}
            {showMarketplace && activeTab === "chat" && (
              <div className="shrink-0 px-4 pb-4">
                <GroceryComparison
                  comparisons={marketplaceComparisons}
                  groceryListItems={groceryListItems.map(item => item.name)}
                />
              </div>
            )}
          </TabsContent>

          {/* Marketplace Tab */}
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

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="flex-1 p-4 mt-0 overflow-auto">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-3xl font-bold text-foreground mb-2">Your Meal Plan</h2>
                  <p className="text-muted-foreground">
                    Personalized weekly meals optimized for your goals
                  </p>
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

              <MealCalendar mealPlan={mealPlan} />

              <div className="grid md:grid-cols-2 gap-6">
                <GroceryList items={groceryListItems} totalCost={73} />

                {/* Nutrition Summary */}
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

          {/* Photo Log Tab */}
          <TabsContent value="photos" className="flex-1 p-4 mt-0 overflow-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="mb-6">
                <h2 className="font-display text-3xl font-bold text-foreground mb-2">Photo Log</h2>
                <p className="text-muted-foreground">
                  Upload photos of your meals - we&apos;ll track the nutrition automatically!
                </p>
              </div>

              {/* Upload Options */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Log a Meal */}
                <Card className="p-6 border-2 border-primary/30 hover:border-primary transition-colors cursor-pointer group" onClick={() => setShowMealLog(true)}>
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full gradient-coral flex items-center justify-center text-4xl shadow-playful group-hover:scale-110 transition-transform">
                      📸
                    </div>
                    <h3 className="font-display font-bold text-xl text-foreground mb-2">Log a Meal</h3>
                    <p className="text-muted-foreground text-sm">
                      Snap a photo of what you ate - whether home-cooked or eating out. We&apos;ll estimate the nutrition!
                    </p>
                  </div>
                </Card>

                {/* Generate Recipe from Photo */}
                <Card className="p-6 border-2 border-accent/30 hover:border-accent transition-colors cursor-pointer group" onClick={() => setShowRecipeFromPhoto(true)}>
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full gradient-lime flex items-center justify-center text-4xl shadow-playful-lime group-hover:scale-110 transition-transform">
                      🍳
                    </div>
                    <h3 className="font-display font-bold text-xl text-foreground mb-2">Recipe from Photo</h3>
                    <p className="text-muted-foreground text-sm">
                      Loved a dish at a restaurant? Upload a photo and we&apos;ll generate a recipe so you can make it at home!
                    </p>
                  </div>
                </Card>
              </div>

              {/* Recent Photos */}
              <div className="mt-8">
                <h3 className="font-display font-bold text-xl text-foreground mb-4">Recent Meal Photos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Placeholder photos */}
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="aspect-square overflow-hidden group cursor-pointer">
                      <div className="w-full h-full bg-gradient-to-br from-coral/10 to-lime/10 flex items-center justify-center relative">
                        <div className="text-center p-4">
                          <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                            {["🍜", "🥗", "🍝", "🥑", "🍛", "🥘"][i - 1]}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {["Yesterday", "2 days ago", "3 days ago", "Last week", "Last week", "2 weeks ago"][i - 1]}
                          </div>
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-white/90 rounded-lg p-2 text-center">
                            <div className="text-xs font-bold text-primary">~450 cal</div>
                            <div className="text-xs text-muted-foreground">tap to view</div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Log Meal Modal */}
      {showMealLog && (
        <MealLogModal
          onClose={() => setShowMealLog(false)}
          plannedMeals={
            // Get today's planned meals from the meal plan
            (() => {
              const today = new Date();
              const todayDay = mealPlan.days.find(
                (d) => d.date.toDateString() === today.toDateString()
              );
              if (!todayDay) return [];
              const meals: Array<{ name: string; mealType: string }> = [];
              if (todayDay.meals.breakfast?.recipe) {
                meals.push({ name: todayDay.meals.breakfast.recipe.name, mealType: "breakfast" });
              }
              if (todayDay.meals.lunch?.recipe) {
                meals.push({ name: todayDay.meals.lunch.recipe.name, mealType: "lunch" });
              }
              if (todayDay.meals.dinner?.recipe) {
                meals.push({ name: todayDay.meals.dinner.recipe.name, mealType: "dinner" });
              }
              return meals;
            })()
          }
        />
      )}

      {/* Recipe from Photo Modal */}
      {showRecipeFromPhoto && (
        <RecipeFromPhotoModal
          onClose={() => setShowRecipeFromPhoto(false)}
          onRecipeGenerated={(recipeId) => {
            setShowRecipeFromPhoto(false);
            router.push(`/recipe/${recipeId}`);
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
              <button
                onClick={() => setShowNutritionDashboard(false)}
                className="text-muted-foreground hover:text-foreground text-2xl"
              >
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
              weeklyAvg={{
                calories: 1395,
                protein: 52,
                carbs: 170,
                fat: 48,
              }}
              mealsLogged={3}
              streak={5}
              goals={["weight-loss", "muscle", "save-money"]}
            />

            <div className="mt-4 pt-4 border-t border-border/50">
              <Button
                variant="outline"
                onClick={() => setShowNutritionDashboard(false)}
                className="w-full border-2"
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border/50 py-4 px-4 text-center bg-background/50">
        <p className="text-sm text-muted-foreground">
          Made with <span className="text-primary">♥</span> at TreeHacks 2026 |{" "}
          <span className="font-display font-bold text-foreground">Mahm</span>{" "}
          — Made At Home Mmmm
        </p>
      </footer>
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
