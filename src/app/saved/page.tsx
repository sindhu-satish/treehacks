"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { dummyRecipes, dummyJournalEntries, dummyShortFormContent } from "@/lib/dummy-data";

export default function SavedPage() {
  const router = useRouter();
  const savedRecipes = dummyRecipes.filter((r) => r.isSaved);
  const madeRecipes = dummyRecipes.filter((r) => r.madeCount && r.madeCount > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-hero border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/")}
              className="text-muted-foreground hover:text-charcoal"
            >
              ← Back
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-charcoal">My Recipes</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="saved" className="w-full">
          <TabsList className="bg-white border border-border/50 p-1 mb-6">
            <TabsTrigger
              value="saved"
              className="data-[state=active]:bg-coral/10 data-[state=active]:text-coral"
            >
              Saved ({savedRecipes.length})
            </TabsTrigger>
            <TabsTrigger
              value="made"
              className="data-[state=active]:bg-coral/10 data-[state=active]:text-coral"
            >
              Made ({madeRecipes.length})
            </TabsTrigger>
            <TabsTrigger
              value="inspiration"
              className="data-[state=active]:bg-coral/10 data-[state=active]:text-coral"
            >
              Inspiration
            </TabsTrigger>
          </TabsList>

          {/* Saved Recipes */}
          <TabsContent value="saved">
            {savedRecipes.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="text-4xl mb-4">♡</div>
                <h3 className="font-bold text-charcoal mb-2">No saved recipes yet</h3>
                <p className="text-muted-foreground mb-4">
                  Save recipes you love and they'll appear here
                </p>
                <Button onClick={() => router.push("/")} className="gradient-coral text-white">
                  Explore recipes
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {savedRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onSelect={() => router.push(`/recipe/${recipe.id}`)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Made Recipes (Cooking Journal) */}
          <TabsContent value="made">
            {madeRecipes.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="text-4xl mb-4">👩‍🍳</div>
                <h3 className="font-bold text-charcoal mb-2">No recipes made yet</h3>
                <p className="text-muted-foreground mb-4">
                  When you make a recipe, mark it as made to track your cooking journey
                </p>
                <Button onClick={() => router.push("/")} className="gradient-coral text-white">
                  Find something to cook
                </Button>
              </Card>
            ) : (
              <div className="space-y-6">
                {madeRecipes.map((recipe) => {
                  const entries = dummyJournalEntries.filter((j) => j.recipeId === recipe.id);
                  return (
                    <Card key={recipe.id} className="p-4">
                      <div
                        className="flex gap-4 cursor-pointer"
                        onClick={() => router.push(`/recipe/${recipe.id}`)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-charcoal">{recipe.name}</h3>
                            <Badge className="bg-lime/20 text-charcoal border-0">
                              Made {recipe.madeCount}x
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {recipe.description}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-lg font-bold text-coral">
                            ${recipe.estimatedCost?.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">per recipe</div>
                        </div>
                      </div>

                      {/* Recent entries */}
                      {entries.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <div className="text-sm font-medium text-muted-foreground mb-2">
                            Recent notes
                          </div>
                          <div className="space-y-2">
                            {entries.slice(0, 2).map((entry) => (
                              <div
                                key={entry.id}
                                className="p-3 bg-muted/30 rounded-lg text-sm"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-muted-foreground">
                                    {new Date(entry.madeAt).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <span
                                        key={star}
                                        className={`text-xs ${
                                          star <= entry.rating ? "text-sunny" : "text-muted"
                                        }`}
                                      >
                                        ★
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                {entry.notes && (
                                  <p className="text-charcoal">{entry.notes}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Inspiration (Short-form content) */}
          <TabsContent value="inspiration">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-charcoal mb-2">Trending recipes</h2>
              <p className="text-muted-foreground text-sm">
                Paste a TikTok, Reel, or YouTube Short and Mahm will extract the recipe for you
              </p>
            </div>

            {/* Paste URL Input */}
            <Card className="p-4 mb-6">
              <div className="flex gap-3">
                <input
                  type="url"
                  placeholder="Paste a TikTok, Instagram Reel, or YouTube Short URL..."
                  className="flex-1 px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-coral/50"
                />
                <Button className="gradient-coral text-white px-6">
                  Extract Recipe
                </Button>
              </div>
            </Card>

            {/* Short-form content grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {dummyShortFormContent.map((content) => (
                <Card
                  key={content.id}
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-all"
                >
                  <div className="aspect-[9/16] bg-gradient-to-br from-coral/20 to-pink/20 flex items-center justify-center">
                    <div className="text-center p-4">
                      <div className="text-4xl mb-2">
                        {content.platform === "tiktok" && "🎵"}
                        {content.platform === "instagram" && "📷"}
                        {content.platform === "youtube" && "▶️"}
                      </div>
                      <div className="text-sm font-medium text-charcoal line-clamp-2">
                        {content.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {content.creator}
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <Badge
                      variant="outline"
                      className="text-xs bg-muted/30 border-0 capitalize"
                    >
                      {content.platform}
                    </Badge>
                    {content.recipeId ? (
                      <Badge className="ml-2 text-xs bg-lime/20 text-charcoal border-0">
                        Recipe extracted
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 text-xs text-coral hover:text-coral"
                      >
                        Extract recipe →
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
