"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  dummyRecipes,
  dummyGroceryComparison,
  dummyMealPlan,
  dummyChatHistory,
} from "@/lib/dummy-data";
import { ChatMessage as ChatMessageType } from "@/types";

// Recipe from Photo Modal Component
function RecipeFromPhotoModal({ onClose, onRecipeGenerated }: { onClose: () => void; onRecipeGenerated: (recipeId: string) => void }) {
  const [hasPhoto, setHasPhoto] = useState(false);
  const [restaurantName, setRestaurantName] = useState("");
  const [dishName, setDishName] = useState("");
  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<{
    name: string;
    description: string;
    prepTime: number;
    cookTime: number;
    servings: number;
    calories: number;
    ingredients: string[];
    instructions: string[];
  } | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Generate a mock recipe based on the dish name
    const mockRecipe = {
      name: dishName || "Mystery Dish",
      description: `A delicious homemade version of ${dishName || "this amazing dish"}${restaurantName ? ` inspired by ${restaurantName}` : ""}.${notes ? ` ${notes}` : ""}`,
      prepTime: 15,
      cookTime: 25,
      servings: 4,
      calories: 420,
      ingredients: [
        "2 cups main ingredient",
        "1 tbsp olive oil",
        "3 cloves garlic, minced",
        "1 onion, diced",
        "Salt and pepper to taste",
        "Fresh herbs for garnish",
        "1 cup sauce or broth",
        "Optional: protein of choice",
      ],
      instructions: [
        "Prep all ingredients by washing and chopping as needed.",
        "Heat olive oil in a large pan over medium-high heat.",
        "Sauté garlic and onion until fragrant, about 2 minutes.",
        "Add main ingredients and cook until tender.",
        "Season with salt, pepper, and your favorite spices.",
        "Add sauce or broth and simmer for 10-15 minutes.",
        "Adjust seasoning to taste and garnish with fresh herbs.",
        "Serve hot and enjoy your homemade creation!",
      ],
    };

    setGeneratedRecipe(mockRecipe);
    setIsGenerating(false);
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
              <h2 className="font-display text-2xl font-bold text-charcoal">
                {isGenerating ? "Generating Recipe..." : "Extract Recipe"}
              </h2>
              {!isGenerating && (
                <button onClick={onClose} className="text-muted-foreground hover:text-charcoal text-2xl">
                  ×
                </button>
              )}
            </div>

            {isGenerating ? (
              <div className="py-12 text-center">
                <div className="text-6xl mb-6 animate-bounce">🍳</div>
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-lime rounded-full animate-pulse" />
                    <span className="text-muted-foreground">Analyzing photo...</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-coral rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                    <span className="text-muted-foreground">Identifying ingredients...</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-sunny rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
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
                      ? "border-lime bg-lime/10"
                      : "border-lime/30 hover:border-lime hover:bg-lime/5"
                  }`}
                >
                  {hasPhoto ? (
                    <>
                      <div className="text-5xl mb-2">✓</div>
                      <p className="font-bold text-lime">Photo uploaded!</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setHasPhoto(false);
                        }}
                        className="text-xs text-muted-foreground hover:text-coral mt-2"
                      >
                        Remove photo
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-5xl mb-3 animate-float">📸</div>
                      <p className="font-bold text-charcoal mb-1">Upload a photo of a dish</p>
                      <p className="text-sm text-muted-foreground">We&apos;ll create a recipe you can make at home!</p>
                    </>
                  )}
                </div>

                {/* Where did you have it? */}
                <div className="mb-4">
                  <label className="font-bold text-charcoal mb-2 block">Where did you have this?</label>
                  <input
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="Restaurant name (optional)"
                    className="w-full p-3 border-2 border-border rounded-xl focus:outline-none focus:border-lime transition-colors"
                  />
                </div>

                {/* Dish name if known */}
                <div className="mb-4">
                  <label className="font-bold text-charcoal mb-2 block">Dish name (if you know it)</label>
                  <input
                    type="text"
                    value={dishName}
                    onChange={(e) => setDishName(e.target.value)}
                    placeholder="E.g., Pad Thai, Caesar Salad..."
                    className="w-full p-3 border-2 border-border rounded-xl focus:outline-none focus:border-lime transition-colors"
                  />
                </div>

                {/* Notes */}
                <div className="mb-6">
                  <label className="font-bold text-charcoal mb-2 block">Any notes about the dish?</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="E.g., It was creamy, had lots of garlic, tasted smoky..."
                    className="w-full p-3 border-2 border-border rounded-xl resize-none h-20 focus:outline-none focus:border-lime transition-colors"
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={!hasPhoto}
                  className="w-full gradient-lime text-white font-bold text-lg py-6 shadow-playful-lime hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  Generate Recipe
                </Button>

                {!hasPhoto && (
                  <p className="text-xs text-center text-coral mt-3">
                    Please upload a photo to generate a recipe
                  </p>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {/* Generated Recipe View */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-bold text-charcoal">Recipe Generated!</h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-charcoal text-2xl">
                ×
              </button>
            </div>

            <div className="mb-4 p-4 bg-lime/10 rounded-2xl border-2 border-lime/30">
              <div className="text-center mb-2">
                <span className="text-4xl">🎉</span>
              </div>
              <h3 className="font-display text-xl font-bold text-charcoal text-center mb-2">
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
                <div className="font-bold text-charcoal">{generatedRecipe.prepTime}m</div>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <div className="text-lg">🍳</div>
                <div className="text-xs text-muted-foreground">Cook</div>
                <div className="font-bold text-charcoal">{generatedRecipe.cookTime}m</div>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <div className="text-lg">👥</div>
                <div className="text-xs text-muted-foreground">Serves</div>
                <div className="font-bold text-charcoal">{generatedRecipe.servings}</div>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <div className="text-lg">🔥</div>
                <div className="text-xs text-muted-foreground">Cal</div>
                <div className="font-bold text-coral">{generatedRecipe.calories}</div>
              </div>
            </div>

            {/* Ingredients preview */}
            <div className="mb-4">
              <h4 className="font-bold text-charcoal mb-2">Ingredients ({generatedRecipe.ingredients.length})</h4>
              <div className="bg-muted/20 rounded-xl p-3 max-h-32 overflow-y-auto">
                <ul className="text-sm space-y-1">
                  {generatedRecipe.ingredients.map((ing, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-lime rounded-full" />
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Instructions preview */}
            <div className="mb-6">
              <h4 className="font-bold text-charcoal mb-2">Instructions ({generatedRecipe.instructions.length} steps)</h4>
              <div className="bg-muted/20 rounded-xl p-3 max-h-32 overflow-y-auto">
                <ol className="text-sm space-y-2">
                  {generatedRecipe.instructions.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-bold text-coral shrink-0">{i + 1}.</span>
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
function MealLogModal({ onClose }: { onClose: () => void }) {
  const [mealPlanStatus, setMealPlanStatus] = useState<"planned" | "unplanned" | null>(null);
  const [mealType, setMealType] = useState<string | null>(null);
  const [hasPhoto, setHasPhoto] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-bold text-charcoal">Log a Meal</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-charcoal text-2xl">
            ×
          </button>
        </div>

        {/* Step 1: Was this on your meal plan? */}
        <div className="mb-5">
          <label className="font-bold text-charcoal mb-3 block text-lg">Was this on your meal plan?</label>
          <div className="flex gap-3">
            <button
              onClick={() => setMealPlanStatus("planned")}
              className={`flex-1 px-4 py-4 rounded-xl text-sm font-bold transition-all ${
                mealPlanStatus === "planned"
                  ? "bg-lime text-white shadow-playful-lime scale-105"
                  : "bg-lime/10 text-charcoal hover:bg-lime/20 border-2 border-lime/30"
              }`}
            >
              <span className="text-2xl block mb-1">✓</span>
              Yes, planned meal
            </button>
            <button
              onClick={() => setMealPlanStatus("unplanned")}
              className={`flex-1 px-4 py-4 rounded-xl text-sm font-bold transition-all ${
                mealPlanStatus === "unplanned"
                  ? "bg-sunny text-charcoal shadow-playful-sunny scale-105"
                  : "bg-sunny/10 text-charcoal hover:bg-sunny/20 border-2 border-sunny/30"
              }`}
            >
              <span className="text-2xl block mb-1">🍽️</span>
              No, unplanned
            </button>
          </div>
        </div>

        {/* Step 2: Meal Type */}
        <div className="mb-5">
          <label className="font-bold text-charcoal mb-2 block">Meal type</label>
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
                    ? "bg-coral text-white"
                    : "bg-coral/10 text-coral hover:bg-coral/20"
                }`}
              >
                {icon} {type}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Photo Upload - Required for unplanned, optional for planned */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="font-bold text-charcoal">
              Photo of your meal
              {mealPlanStatus === "planned" && (
                <span className="text-muted-foreground font-normal text-sm ml-2">(optional)</span>
              )}
            </label>
            {mealPlanStatus === "planned" && hasPhoto && (
              <button
                onClick={() => setHasPhoto(false)}
                className="text-xs text-muted-foreground hover:text-coral"
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
                  ? "border-coral/50 hover:border-coral bg-coral/5"
                  : "border-border hover:border-coral/30"
              }`}
            >
              <div className="text-4xl mb-2">📷</div>
              <p className="font-bold text-charcoal mb-1">Tap to upload a photo</p>
              <p className="text-xs text-muted-foreground">
                {mealPlanStatus === "unplanned"
                  ? "Required for nutrition analysis"
                  : "Optional - we already know your planned meal!"}
              </p>
            </div>
          ) : (
            <div className="bg-lime/10 border-2 border-lime rounded-2xl p-4 text-center">
              <div className="text-4xl mb-2">✓</div>
              <p className="font-bold text-lime">Photo uploaded!</p>
            </div>
          )}
        </div>

        {/* If planned meal - show which recipe */}
        {mealPlanStatus === "planned" && (
          <div className="mb-5 p-4 bg-lime/5 rounded-xl border-2 border-lime/20">
            <label className="font-bold text-charcoal mb-2 block text-sm">Select your planned meal</label>
            <div className="space-y-2">
              {["Creamy Lentil Dal", "Chickpea Tikka Masala", "Black Bean Tacos"].map((meal) => (
                <button
                  key={meal}
                  className="w-full p-3 rounded-lg text-left text-sm font-medium bg-white hover:bg-lime/10 border-2 border-transparent hover:border-lime/30 transition-all"
                >
                  {meal}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* If unplanned - description field */}
        {mealPlanStatus === "unplanned" && (
          <>
            <div className="mb-4">
              <label className="font-bold text-charcoal mb-2 block">Where did you eat?</label>
              <input
                type="text"
                placeholder="Restaurant name or 'home-cooked'..."
                className="w-full p-3 border-2 border-border rounded-xl focus:outline-none focus:border-coral transition-colors"
              />
            </div>
            <div className="mb-4">
              <label className="font-bold text-charcoal mb-2 block">What did you eat?</label>
              <textarea
                placeholder="E.g., Chicken salad with avocado, grilled salmon..."
                className="w-full p-3 border-2 border-border rounded-xl resize-none h-20 focus:outline-none focus:border-coral transition-colors"
              />
            </div>
          </>
        )}

        {/* Portion Size */}
        <div className="mb-6">
          <label className="font-bold text-charcoal mb-2 block">Portion size</label>
          <div className="flex gap-2">
            {["Small", "Regular", "Large", "XL"].map((size) => (
              <button
                key={size}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-muted/50 text-charcoal hover:bg-coral/20 transition-colors"
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <Button
          className="w-full gradient-coral text-white font-bold text-lg py-6 shadow-playful hover:scale-105 transition-transform"
          disabled={!mealPlanStatus || !mealType || (mealPlanStatus === "unplanned" && !hasPhoto)}
        >
          {mealPlanStatus === "planned" ? "Log Meal" : "Analyze Meal"}
        </Button>

        {mealPlanStatus === "unplanned" && !hasPhoto && (
          <p className="text-xs text-center text-coral mt-2">
            Photo required for unplanned meals to estimate nutrition
          </p>
        )}
      </Card>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>(dummyChatHistory);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [showRecipes, setShowRecipes] = useState(true);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [showMealLog, setShowMealLog] = useState(false);
  const [showRecipeFromPhoto, setShowRecipeFromPhoto] = useState(false);
  const [showNutritionDashboard, setShowNutritionDashboard] = useState(false);
  const [findingStores, setFindingStores] = useState(false);
  const [storesFound, setStoresFound] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check if user has completed onboarding
  useEffect(() => {
    const onboarded = localStorage.getItem("mahm_onboarded");
    setIsOnboarded(onboarded === "true");
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Show loading state while checking onboarding
  if (isOnboarded === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <MahmLogo size="xl" />
          <p className="mt-4 text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page if not onboarded
  if (!isOnboarded) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Fun background elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-coral/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-lime/20 rounded-full blur-3xl translate-x-1/2" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-sunny/20 rounded-full blur-3xl translate-y-1/2" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-pink/20 rounded-full blur-3xl" />

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

            <h1 className="font-display text-5xl md:text-7xl font-bold text-charcoal mb-6">
              Like having a{" "}
              <span className="text-coral">mom</span>
              <br />
              who&apos;s also a{" "}
              <span className="text-lime">nutritionist</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mb-10">
              Tell Mahm your dietary needs, budget, and cravings. She&apos;ll recommend meals,
              find the cheapest local ingredients, and plan your whole week.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <div className="px-6 py-3 bg-coral/20 rounded-full font-bold text-coral shadow-playful animate-bounce-subtle">
                Personalized nutrition
              </div>
              <div className="px-6 py-3 bg-lime/20 rounded-full font-bold text-charcoal shadow-playful-lime animate-bounce-subtle" style={{ animationDelay: "0.1s" }}>
                Real local prices
              </div>
              <div className="px-6 py-3 bg-sunny/30 rounded-full font-bold text-charcoal shadow-playful-sunny animate-bounce-subtle" style={{ animationDelay: "0.2s" }}>
                Weekly meal plans
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => router.push("/onboarding")}
                className="gradient-coral text-white font-display font-bold text-xl px-10 py-7 rounded-2xl shadow-playful hover:scale-105 transition-transform"
              >
                Get Started Free
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Demo mode - set onboarded and reload
                  localStorage.setItem("mahm_onboarded", "true");
                  setIsOnboarded(true);
                }}
                className="border-2 border-coral text-coral font-display font-bold text-xl px-10 py-7 rounded-2xl hover:bg-coral/10"
              >
                Try Demo
              </Button>
            </div>
          </main>

          {/* Features Section */}
          <section className="px-4 py-16 bg-white/50">
            <div className="max-w-5xl mx-auto">
              <h2 className="font-display text-3xl font-bold text-charcoal text-center mb-12">
                Everything you need to eat well
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                <Card className="p-6 border-2 border-coral/20 shadow-playful text-center">
                  <div className="text-5xl mb-4">💬</div>
                  <h3 className="font-display font-bold text-xl text-charcoal mb-2">Chat with Mahm</h3>
                  <p className="text-muted-foreground">
                    Get personalized meal recommendations based on your preferences, goals, and what&apos;s in your fridge.
                  </p>
                </Card>
                <Card className="p-6 border-2 border-lime/20 shadow-playful-lime text-center">
                  <div className="text-5xl mb-4">🛒</div>
                  <h3 className="font-display font-bold text-xl text-charcoal mb-2">Smart Marketplace</h3>
                  <p className="text-muted-foreground">
                    Compare prices across local stores and find the best deals for your grocery list.
                  </p>
                </Card>
                <Card className="p-6 border-2 border-sunny/30 shadow-playful-sunny text-center">
                  <div className="text-5xl mb-4">📅</div>
                  <h3 className="font-display font-bold text-xl text-charcoal mb-2">Meal Calendar</h3>
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
              Made with <span className="text-coral">♥</span> at TreeHacks 2026
            </p>
          </footer>
        </div>
      </div>
    );
  }

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const lowerContent = content.toLowerCase();
      let response: ChatMessageType;

      if (lowerContent.includes("where") && (lowerContent.includes("buy") || lowerContent.includes("ingredient") || lowerContent.includes("store"))) {
        // Marketplace response
        response = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Great question! I found the ingredients for Creamy Lentil Dal at 3 stores near you. Here's the price breakdown:\n\n**Best deals:**\n- Red lentils are cheapest at **Trader Joe's** ($2.99)\n- Coconut milk is also best at **Trader Joe's** ($1.99)\n- Spinach is cheapest at **Safeway** ($2.29)\n\nYou could save about $3.50 by shopping at Trader Joe's for most items! Want me to plan your whole week so you can do one efficient shopping trip?",
          timestamp: new Date(),
          toolCalls: [
            { id: "tc1", name: "find_stores", status: "complete" },
          ],
        };
        setShowMarketplace(true);
      } else if (lowerContent.includes("plan") && (lowerContent.includes("week") || lowerContent.includes("meal"))) {
        // Meal plan response
        response = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I've put together a week of delicious meals for you! Here's what I came up with:\n\n**Your 7-day plan includes:**\n- 21 meals (breakfast, lunch, dinner)\n- All vegetarian & dairy-free\n- Average 1,400 cal/day (great for weight loss)\n- High protein to keep you full\n- No tofu anywhere!\n\n**Total grocery cost: $73** (under your $80 budget!)\n\nI've also synced this to your Google Calendar with prep reminders. The grocery list has 23 items - I'd recommend doing your shopping Sunday morning.\n\nWhat do you think? Want me to swap anything out?",
          timestamp: new Date(),
          toolCalls: [
            { id: "tc1", name: "generate_meal_plan", status: "complete" },
            { id: "tc2", name: "find_stores", status: "complete" },
          ],
        };
        setActiveTab("calendar");
      } else if (lowerContent.includes("love") || lowerContent.includes("great") || lowerContent.includes("perfect") || lowerContent.includes("sounds good")) {
        response = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Yay! So glad you like it!\n\nA few tips for your cooking journey:\n\n1. **Start with the dal** - it's super forgiving and makes great leftovers\n2. **Prep your spices** in advance - makes weeknight cooking way faster\n3. **Don't skip the spinach** in the dal - it adds iron, which is important since you mentioned feeling tired\n\nNeed me to find where to buy ingredients, or want to see your full week plan?",
          timestamp: new Date(),
        };
      } else {
        // Default recipe recommendation response
        response = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Based on what you've told me, I think you'll love these options! Each one is:\n\n- Vegetarian & dairy-free\n- Under 30 minutes\n- Beginner-friendly (no fancy techniques)\n- High in protein for weight loss\n- Budget-friendly\n\nTake a look and let me know which catches your eye - I can find the ingredients at stores near you, or plan out your whole week!",
          timestamp: new Date(),
          toolCalls: [
            { id: "tc1", name: "search_recipes", status: "complete" },
            { id: "tc2", name: "get_nutrition", status: "complete" },
          ],
        };
        setShowRecipes(true);
      }

      setMessages((prev) => [...prev, response]);
      setIsTyping(false);
    }, 1500);
  };

  const handleFindStores = async () => {
    setFindingStores(true);
    // Simulate finding stores (will be replaced with BrightData integration)
    await new Promise(resolve => setTimeout(resolve, 2000));
    setFindingStores(false);
    setStoresFound(true);
  };

  const groceryListItems = [
    { name: "Red lentils", amount: "2 cups", category: "grains", estimatedPrice: 2.99 },
    { name: "Coconut milk", amount: "2 cans", category: "canned", estimatedPrice: 3.98 },
    { name: "Chickpeas", amount: "4 cans", category: "canned", estimatedPrice: 3.96 },
    { name: "Black beans", amount: "4 cans", category: "canned", estimatedPrice: 3.96 },
    { name: "Fresh spinach", amount: "10 oz", category: "produce", estimatedPrice: 4.58 },
    { name: "Cauliflower", amount: "2 heads", category: "produce", estimatedPrice: 5.98 },
    { name: "Bell peppers", amount: "4 medium", category: "produce", estimatedPrice: 3.96 },
    { name: "Avocados", amount: "4 medium", category: "produce", estimatedPrice: 3.16 },
    { name: "Red cabbage", amount: "1 small", category: "produce", estimatedPrice: 2.49 },
    { name: "Onions", amount: "3 medium", category: "produce", estimatedPrice: 1.50 },
    { name: "Garlic", amount: "2 heads", category: "produce", estimatedPrice: 1.00 },
    { name: "Fresh ginger", amount: "1 piece", category: "produce", estimatedPrice: 0.75 },
    { name: "Limes", amount: "4", category: "produce", estimatedPrice: 1.00 },
    { name: "Cilantro", amount: "2 bunches", category: "produce", estimatedPrice: 1.98 },
    { name: "Corn tortillas", amount: "24 count", category: "grains", estimatedPrice: 3.49 },
    { name: "Turmeric", amount: "1 jar", category: "spices", estimatedPrice: 3.99 },
    { name: "Cumin", amount: "1 jar", category: "spices", estimatedPrice: 3.99 },
    { name: "Garam masala", amount: "1 jar", category: "spices", estimatedPrice: 4.99 },
    { name: "Curry powder", amount: "1 jar", category: "spices", estimatedPrice: 3.99 },
    { name: "Vegetable broth", amount: "2 cartons", category: "canned", estimatedPrice: 5.98 },
    { name: "Tomato paste", amount: "2 cans", category: "canned", estimatedPrice: 1.98 },
    { name: "Salsa verde", amount: "1 jar", category: "canned", estimatedPrice: 3.49 },
    { name: "Coconut cream", amount: "1 can", category: "canned", estimatedPrice: 2.49 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Hero Header */}
      <header className="gradient-hero border-b border-border/50 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-coral/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-0 right-0 w-40 h-40 bg-lime/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-sunny/20 rounded-full blur-2xl translate-y-1/2" />

        <div className="max-w-6xl mx-auto px-4 py-4 relative">
          <div className="flex items-center justify-between">
            <div className="cursor-pointer" onClick={() => router.push("/")}>
              <MahmLogo size="md" />
            </div>
            <nav className="flex items-center gap-2 md:gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMealLog(true)}
                className="text-muted-foreground hover:text-coral hover:bg-coral/10 font-semibold"
              >
                <span className="mr-1">📸</span>
                <span className="hidden sm:inline">Log Meal</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/saved")}
                className="text-muted-foreground hover:text-coral hover:bg-coral/10 font-semibold"
              >
                <span className="hidden sm:inline">My Recipes</span>
                <span className="sm:hidden text-lg">♥</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/profile")}
                className="text-muted-foreground hover:text-coral hover:bg-coral/10 font-semibold"
              >
                <span className="hidden sm:inline">Profile</span>
                <span className="sm:hidden text-lg">⚙</span>
              </Button>
              <div
                onClick={() => router.push("/profile")}
                className="w-9 h-9 rounded-full gradient-coral text-white flex items-center justify-center text-sm font-bold cursor-pointer shadow-playful hover:scale-105 transition-transform"
              >
                A
              </div>
            </nav>
          </div>

          {/* Tagline - only show on landing */}
          {messages.length <= 1 && (
            <div className="mt-10 mb-6 text-center relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 animate-float">
                <MahmLogo size="xl" showText={false} />
              </div>
              <div className="pt-24">
                <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-charcoal mb-4 bubble-text">
                  Like having a{" "}
                  <span className="text-coral squiggly">mom</span> who&apos;s also a{" "}
                  <span className="text-lime">nutritionist</span>
                </h2>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
                  Tell Mahm your dietary needs, budget, and cravings. She&apos;ll recommend meals,
                  find the cheapest local ingredients, and plan your whole week.
                </p>
                <div className="flex flex-wrap justify-center gap-3 mt-8">
                  <span className="px-5 py-2.5 bg-coral/20 rounded-full text-sm font-bold text-coral shadow-playful sticker">
                    Personalized nutrition
                  </span>
                  <span className="px-5 py-2.5 bg-lime/20 rounded-full text-sm font-bold text-charcoal shadow-playful-lime sticker" style={{ animationDelay: "0.1s" }}>
                    Real local prices
                  </span>
                  <span className="px-5 py-2.5 bg-sunny/30 rounded-full text-sm font-bold text-charcoal shadow-playful-sunny sticker" style={{ animationDelay: "0.2s" }}>
                    Weekly meal plans
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-6xl mx-auto w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="border-b border-border/50 px-4 bg-white/50">
            <TabsList className="bg-transparent h-auto p-0 gap-2 md:gap-6">
              <TabsTrigger
                value="chat"
                className="data-[state=active]:bg-transparent data-[state=active]:text-coral data-[state=active]:border-b-3 data-[state=active]:border-coral rounded-none px-2 pb-3 pt-4 font-display font-bold text-base md:text-lg transition-all hover:text-coral"
              >
                Chat with Mahm
              </TabsTrigger>
              <TabsTrigger
                value="marketplace"
                className="data-[state=active]:bg-transparent data-[state=active]:text-coral data-[state=active]:border-b-3 data-[state=active]:border-coral rounded-none px-2 pb-3 pt-4 font-display font-bold text-base md:text-lg transition-all hover:text-coral"
              >
                Marketplace
              </TabsTrigger>
              <TabsTrigger
                value="calendar"
                className="data-[state=active]:bg-transparent data-[state=active]:text-coral data-[state=active]:border-b-3 data-[state=active]:border-coral rounded-none px-2 pb-3 pt-4 font-display font-bold text-base md:text-lg transition-all hover:text-coral"
              >
                Meal Calendar
              </TabsTrigger>
              <TabsTrigger
                value="photos"
                className="data-[state=active]:bg-transparent data-[state=active]:text-coral data-[state=active]:border-b-3 data-[state=active]:border-coral rounded-none px-2 pb-3 pt-4 font-display font-bold text-base md:text-lg transition-all hover:text-coral"
              >
                Photo Log
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Chat Tab */}
          <TabsContent value="chat" className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden">
            <div className="flex-1 flex gap-4 p-4 overflow-hidden">
              {/* Chat Messages */}
              <div className="flex-1 flex flex-col min-w-0">
                <ScrollArea className="flex-1" ref={scrollRef}>
                  <div className="pb-4">
                    {messages.map((message, index) => {
                      const currentDate = new Date(message.timestamp).toDateString();
                      const prevDate = index > 0 ? new Date(messages[index - 1].timestamp).toDateString() : null;
                      const showDateSeparator = index === 0 || currentDate !== prevDate;

                      return (
                        <div key={message.id}>
                          {showDateSeparator && <DateSeparator date={message.timestamp} />}
                          <ChatMessage message={message} />
                        </div>
                      );
                    })}
                    {isTyping && <TypingIndicator />}
                  </div>
                </ScrollArea>
              </div>

              {/* Side Panel - Recipes */}
              {showRecipes && (
                <div className="hidden lg:block w-80 shrink-0 overflow-y-auto">
                  <div className="sticky top-0 bg-background pb-2">
                    <h3 className="font-display font-bold text-charcoal mb-3 flex items-center justify-between">
                      <span>Recommended for you</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/saved")}
                        className="text-coral text-xs font-bold"
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
              <div className="px-4 pb-4">
                <GroceryComparison
                  comparisons={dummyGroceryComparison}
                  groceryListItems={groceryListItems.map(item => item.name)}
                />
              </div>
            )}

            <ChatInput onSend={handleSendMessage} disabled={isTyping} />
          </TabsContent>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="flex-1 p-4 mt-0 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="font-display text-3xl font-bold text-charcoal mb-2">Smart Marketplace</h2>
                <p className="text-muted-foreground">
                  Find the best prices for your ingredients at stores near you
                </p>
              </div>

              {/* Location Input */}
              <div className="flex items-center gap-3 mb-6 p-4 bg-white rounded-2xl border-2 border-coral/20 shadow-playful">
                <span className="text-2xl animate-bounce-subtle">📍</span>
                <input
                  type="text"
                  placeholder="Enter your zip code"
                  defaultValue="94305"
                  className="flex-1 bg-transparent focus:outline-none text-charcoal font-medium text-lg"
                />
                <Button
                  onClick={handleFindStores}
                  disabled={findingStores}
                  className="gradient-coral text-white font-bold px-6 shadow-playful hover:scale-105 transition-transform disabled:opacity-70 disabled:hover:scale-100"
                >
                  {findingStores ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">🔍</span>
                      Finding...
                    </span>
                  ) : storesFound ? (
                    <span className="flex items-center gap-2">
                      <span>✓</span>
                      Refresh stores
                    </span>
                  ) : (
                    "Find stores"
                  )}
                </Button>
              </div>

              {/* Loading state */}
              {findingStores && (
                <div className="mb-6 p-6 bg-white rounded-2xl border-2 border-lime/30 text-center">
                  <div className="text-4xl mb-4 animate-bounce">🏪</div>
                  <div className="space-y-2">
                    <p className="font-bold text-charcoal">Finding stores near you...</p>
                    <div className="flex justify-center gap-1">
                      <span className="w-2 h-2 bg-coral rounded-full animate-pulse" />
                      <span className="w-2 h-2 bg-lime rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                      <span className="w-2 h-2 bg-sunny rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                    </div>
                    <p className="text-sm text-muted-foreground">Checking prices at Trader Joe&apos;s, Safeway, Whole Foods...</p>
                  </div>
                </div>
              )}

              {/* Stores found message */}
              {storesFound && !findingStores && (
                <div className="mb-4 p-3 bg-lime/10 rounded-xl border border-lime/30 flex items-center gap-2">
                  <span className="text-lg">✓</span>
                  <span className="text-sm font-medium text-charcoal">Found 3 stores near 94305 with competitive prices!</span>
                </div>
              )}

              <GroceryComparison
                comparisons={dummyGroceryComparison}
                groceryListItems={groceryListItems.map(item => item.name)}
              />
            </div>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="flex-1 p-4 mt-0 overflow-auto">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-3xl font-bold text-charcoal mb-2">Your Meal Plan</h2>
                  <p className="text-muted-foreground">
                    Personalized weekly meals optimized for your goals
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" className="border-2 border-coral text-coral hover:bg-coral/10 font-bold">
                    Sync to Calendar
                  </Button>
                  <Button className="gradient-coral text-white font-bold shadow-playful hover:scale-105 transition-transform">
                    Regenerate Plan
                  </Button>
                </div>
              </div>

              <MealCalendar mealPlan={dummyMealPlan} />

              <div className="grid md:grid-cols-2 gap-6">
                <GroceryList items={groceryListItems} totalCost={73} />

                {/* Nutrition Summary */}
                <div className="bg-white rounded-2xl border-2 border-lime/30 p-4 shadow-playful-lime">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-bold text-charcoal flex items-center gap-2">
                      <span className="text-xl">🥗</span> Weekly Nutrition Summary
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNutritionDashboard(true)}
                      className="border-2 border-lime text-lime hover:bg-lime hover:text-white font-bold text-xs"
                    >
                      View Full Dashboard
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Avg. daily calories</span>
                      <span className="font-bold text-coral text-lg">1,395 cal</span>
                    </div>
                    <div className="w-full bg-coral/10 rounded-full h-3">
                      <div className="gradient-coral h-3 rounded-full" style={{ width: "70%" }} />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Avg. daily protein</span>
                      <span className="font-bold text-lime text-lg">52g</span>
                    </div>
                    <div className="w-full bg-lime/10 rounded-full h-3">
                      <div className="gradient-lime h-3 rounded-full" style={{ width: "85%" }} />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Avg. daily fiber</span>
                      <span className="font-bold text-sunny text-lg">30g</span>
                    </div>
                    <div className="w-full bg-sunny/20 rounded-full h-3">
                      <div className="gradient-sunny h-3 rounded-full" style={{ width: "100%" }} />
                    </div>

                    <div className="pt-4 border-t-2 border-border/50">
                      <div className="flex items-center gap-2 text-sm font-medium text-lime">
                        <span className="text-lg">✓</span>
                        <span>On track for your weight loss goal</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-lime mt-2">
                        <span className="text-lg">✓</span>
                        <span>High fiber for sustained energy</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-lime mt-2">
                        <span className="text-lg">✓</span>
                        <span>Under budget at $73/week</span>
                      </div>
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
                <h2 className="font-display text-3xl font-bold text-charcoal mb-2">Photo Log</h2>
                <p className="text-muted-foreground">
                  Upload photos of your meals - we&apos;ll track the nutrition automatically!
                </p>
              </div>

              {/* Upload Options */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Log a Meal */}
                <Card className="p-6 border-2 border-coral/30 hover:border-coral transition-colors cursor-pointer group" onClick={() => setShowMealLog(true)}>
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full gradient-coral flex items-center justify-center text-4xl shadow-playful group-hover:scale-110 transition-transform">
                      📸
                    </div>
                    <h3 className="font-display font-bold text-xl text-charcoal mb-2">Log a Meal</h3>
                    <p className="text-muted-foreground text-sm">
                      Snap a photo of what you ate - whether home-cooked or eating out. We&apos;ll estimate the nutrition!
                    </p>
                  </div>
                </Card>

                {/* Generate Recipe from Photo */}
                <Card className="p-6 border-2 border-lime/30 hover:border-lime transition-colors cursor-pointer group" onClick={() => setShowRecipeFromPhoto(true)}>
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full gradient-lime flex items-center justify-center text-4xl shadow-playful-lime group-hover:scale-110 transition-transform">
                      🍳
                    </div>
                    <h3 className="font-display font-bold text-xl text-charcoal mb-2">Recipe from Photo</h3>
                    <p className="text-muted-foreground text-sm">
                      Loved a dish at a restaurant? Upload a photo and we&apos;ll generate a recipe so you can make it at home!
                    </p>
                  </div>
                </Card>
              </div>

              {/* Recent Photos */}
              <div className="mt-8">
                <h3 className="font-display font-bold text-xl text-charcoal mb-4">Recent Meal Photos</h3>
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
                            <div className="text-xs font-bold text-coral">~450 cal</div>
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
        <MealLogModal onClose={() => setShowMealLog(false)} />
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

      {/* Nutrition Dashboard Modal */}
      {showNutritionDashboard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-charcoal flex items-center gap-2">
                <span>📊</span> Nutrition Dashboard
              </h2>
              <button
                onClick={() => setShowNutritionDashboard(false)}
                className="text-muted-foreground hover:text-charcoal text-2xl"
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
      <footer className="border-t border-border/50 py-4 px-4 text-center bg-white/50">
        <p className="text-sm text-muted-foreground">
          Made with <span className="text-coral">♥</span> at TreeHacks 2026 |{" "}
          <span className="font-display font-bold">
            <span className="text-coral">M</span>
            <span className="text-sunny">a</span>
            <span className="text-lime">h</span>
            <span className="text-pink">m</span>
          </span>{" "}
          — Make something your Mahm would be proud of
        </p>
      </footer>
    </div>
  );
}
