"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NutritionBadge } from "@/components/recipe/NutritionBadge";
import { dummyRecipes, dummyJournalEntries } from "@/lib/dummy-data";

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const recipe = dummyRecipes.find((r) => r.id === params.id);
  const journalEntries = dummyJournalEntries.filter((j) => j.recipeId === params.id);

  const [isSaved, setIsSaved] = useState(recipe?.isSaved || false);
  const [showMadeModal, setShowMadeModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [modifications, setModifications] = useState("");

  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-charcoal mb-2">Recipe not found</h1>
          <Button onClick={() => router.push("/")} className="gradient-coral text-white">
            Go back home
          </Button>
        </div>
      </div>
    );
  }

  const totalCost = recipe.ingredients.reduce((sum, ing) => sum + (ing.price || 0), 0);

  const handleSaveMade = () => {
    // In real app, this would save to database
    setShowMadeModal(false);
    setRating(0);
    setNotes("");
    setModifications("");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-hero border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-muted-foreground hover:text-charcoal"
            >
              ← Back
            </Button>
            <div className="flex-1" />
            <Button
              variant={isSaved ? "default" : "outline"}
              onClick={() => setIsSaved(!isSaved)}
              className={isSaved ? "bg-coral text-white" : "border-coral text-coral"}
            >
              {isSaved ? "♥ Saved" : "♡ Save"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Recipe Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-charcoal mb-2">{recipe.name}</h1>
              <p className="text-muted-foreground">{recipe.description}</p>
            </div>
            {recipe.madeCount && recipe.madeCount > 0 && (
              <Badge className="bg-lime/20 text-charcoal border-0 shrink-0">
                Made {recipe.madeCount}x
              </Badge>
            )}
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full shadow-sm">
              <span>⏱️</span>
              <span>{recipe.prepTime + recipe.cookTime} min total</span>
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full shadow-sm">
              <span>👥</span>
              <span>{recipe.servings} servings</span>
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full shadow-sm">
              <span>🍽️</span>
              <span>{recipe.cuisine}</span>
            </span>
            <Badge variant="secondary" className="bg-lime/20 text-charcoal border-0">
              {recipe.difficulty}
            </Badge>
          </div>

          {/* Dietary Tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            {recipe.dietaryTags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="bg-coral-light/30 text-charcoal border-coral/20"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Cost Banner */}
        <Card className="p-4 mb-6 border-lime/30 bg-lime/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Estimated cost</div>
              <div className="text-2xl font-bold text-charcoal">
                ${totalCost.toFixed(2)}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (${(totalCost / recipe.servings).toFixed(2)}/serving)
                </span>
              </div>
              <div className="text-sm text-lime mt-1">
                Cheapest at {recipe.cheapestStore}
              </div>
            </div>
            <Button className="gradient-coral text-white">
              Find ingredients nearby
            </Button>
          </div>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="ingredients" className="mb-6">
          <TabsList className="bg-white border border-border/50 p-1">
            <TabsTrigger value="ingredients" className="data-[state=active]:bg-coral/10 data-[state=active]:text-coral">
              Ingredients
            </TabsTrigger>
            <TabsTrigger value="instructions" className="data-[state=active]:bg-coral/10 data-[state=active]:text-coral">
              Instructions
            </TabsTrigger>
            <TabsTrigger value="nutrition" className="data-[state=active]:bg-coral/10 data-[state=active]:text-coral">
              Nutrition
            </TabsTrigger>
            {journalEntries.length > 0 && (
              <TabsTrigger value="history" className="data-[state=active]:bg-coral/10 data-[state=active]:text-coral">
                My History ({journalEntries.length})
              </TabsTrigger>
            )}
          </TabsList>

          {/* Ingredients Tab */}
          <TabsContent value="ingredients" className="mt-4">
            <Card className="p-4">
              <div className="space-y-3">
                {recipe.ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <input type="checkbox" className="w-5 h-5 rounded border-border accent-coral" />
                      <div>
                        <span className="font-medium">{ing.name}</span>
                        <span className="text-muted-foreground ml-2">
                          {ing.amount} {ing.unit}
                        </span>
                        {ing.notes && (
                          <span className="text-sm text-muted-foreground ml-2">({ing.notes})</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${ing.price?.toFixed(2) || "—"}</div>
                      {ing.cheapestStore && (
                        <div className="text-xs text-lime">{ing.cheapestStore}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Store Comparison for key ingredients */}
              {recipe.ingredients.some((ing) => ing.storeOptions) && (
                <div className="mt-6 pt-4 border-t border-border">
                  <h3 className="font-semibold text-charcoal mb-3">Price comparison</h3>
                  <div className="space-y-3">
                    {recipe.ingredients
                      .filter((ing) => ing.storeOptions)
                      .map((ing, idx) => (
                        <div key={idx} className="bg-muted/30 rounded-lg p-3">
                          <div className="font-medium mb-2">{ing.name}</div>
                          <div className="flex flex-wrap gap-2">
                            {ing.storeOptions?.map((store, sIdx) => (
                              <div
                                key={sIdx}
                                className={`px-3 py-1.5 rounded-lg text-sm ${
                                  store.price === Math.min(...(ing.storeOptions?.map((s) => s.price) || []))
                                    ? "bg-lime/20 border border-lime/30"
                                    : "bg-white"
                                } ${!store.inStock ? "opacity-50" : ""}`}
                              >
                                <span>{store.storeName}</span>
                                <span className="font-bold ml-2">${store.price.toFixed(2)}</span>
                                {!store.inStock && <span className="text-xs text-destructive ml-1">(Out)</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Instructions Tab */}
          <TabsContent value="instructions" className="mt-4">
            <Card className="p-4">
              <ol className="space-y-4">
                {recipe.instructions.map((step, idx) => (
                  <li key={idx} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full gradient-coral text-white flex items-center justify-center font-bold shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-charcoal">{step}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          </TabsContent>

          {/* Nutrition Tab */}
          <TabsContent value="nutrition" className="mt-4">
            <Card className="p-4">
              <h3 className="font-semibold text-charcoal mb-4">Per serving</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-coral/10 rounded-xl">
                  <div className="text-3xl font-bold text-coral">{recipe.nutrition.calories}</div>
                  <div className="text-sm text-muted-foreground">Calories</div>
                </div>
                <div className="text-center p-4 bg-lime/10 rounded-xl">
                  <div className="text-3xl font-bold text-lime">{recipe.nutrition.protein}g</div>
                  <div className="text-sm text-muted-foreground">Protein</div>
                </div>
                <div className="text-center p-4 bg-sunny/20 rounded-xl">
                  <div className="text-3xl font-bold text-charcoal">{recipe.nutrition.carbs}g</div>
                  <div className="text-sm text-muted-foreground">Carbs</div>
                </div>
                <div className="text-center p-4 bg-pink/10 rounded-xl">
                  <div className="text-3xl font-bold text-pink">{recipe.nutrition.fat}g</div>
                  <div className="text-sm text-muted-foreground">Fat</div>
                </div>
              </div>
              {recipe.nutrition.fiber && (
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground">Fiber: </span>
                  <span className="font-medium">{recipe.nutrition.fiber}g</span>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            <Card className="p-4">
              <div className="space-y-4">
                {journalEntries.map((entry) => (
                  <div key={entry.id} className="p-4 bg-muted/30 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-muted-foreground">
                        {new Date(entry.madeAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={star <= entry.rating ? "text-sunny" : "text-muted"}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    {entry.notes && <p className="text-charcoal mb-2">{entry.notes}</p>}
                    {entry.modifications && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Modifications:</span> {entry.modifications}
                      </p>
                    )}
                    {entry.wouldMakeAgain && (
                      <Badge className="mt-2 bg-lime/20 text-charcoal border-0">
                        Would make again
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button className="gradient-coral text-white flex-1 sm:flex-none" size="lg">
            Add to Meal Plan
          </Button>
          <Button
            variant="outline"
            className="border-lime text-lime hover:bg-lime/10 flex-1 sm:flex-none"
            size="lg"
            onClick={() => setShowMadeModal(true)}
          >
            I Made This!
          </Button>
        </div>
      </main>

      {/* "I Made This" Modal */}
      {showMadeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-charcoal mb-4">How did it go?</h2>

            {/* Rating */}
            <div className="mb-4">
              <label className="text-sm font-medium text-charcoal mb-2 block">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-3xl transition-colors ${
                      star <= rating ? "text-sunny" : "text-muted hover:text-sunny/50"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="text-sm font-medium text-charcoal mb-2 block">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How did it taste? Any tips for next time?"
                className="w-full p-3 border border-border rounded-lg resize-none h-20 focus:outline-none focus:ring-2 focus:ring-coral/50"
              />
            </div>

            {/* Modifications */}
            <div className="mb-6">
              <label className="text-sm font-medium text-charcoal mb-2 block">
                Any modifications?
              </label>
              <textarea
                value={modifications}
                onChange={(e) => setModifications(e.target.value)}
                placeholder="Did you swap any ingredients or change the recipe?"
                className="w-full p-3 border border-border rounded-lg resize-none h-20 focus:outline-none focus:ring-2 focus:ring-coral/50"
              />
            </div>

            {/* Photo Upload Placeholder */}
            <div className="mb-6">
              <label className="text-sm font-medium text-charcoal mb-2 block">Add a photo</label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-muted-foreground hover:border-coral/50 cursor-pointer transition-colors">
                📷 Tap to upload a photo
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowMadeModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveMade}
                className="gradient-coral text-white flex-1"
                disabled={rating === 0}
              >
                Save
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
