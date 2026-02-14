"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { MahmLogo } from "@/components/brand/MahmLogo";
import { dummyRecipes, dummyJournalEntries, dummyShortFormContent } from "@/lib/dummy-data";

// Extract Recipe Modal
function ExtractRecipeModal({
  onClose,
  initialUrl = "",
  platform = "link"
}: {
  onClose: () => void;
  initialUrl?: string;
  platform?: string;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedRecipe, setExtractedRecipe] = useState<{
    name: string;
    description: string;
    creator: string;
    ingredients: string[];
    instructions: string[];
    calories: number;
  } | null>(null);

  const handleExtract = async () => {
    if (!url.trim()) return;
    setIsExtracting(true);

    // Simulate extraction
    await new Promise(resolve => setTimeout(resolve, 2000));

    setExtractedRecipe({
      name: "Creamy Garlic Tuscan Shrimp",
      description: "A viral TikTok recipe that's incredibly easy and restaurant-quality delicious!",
      creator: "@healthyeats",
      ingredients: [
        "1 lb large shrimp, peeled and deveined",
        "4 cloves garlic, minced",
        "1 cup heavy cream",
        "1/2 cup parmesan cheese, grated",
        "1 cup sun-dried tomatoes",
        "2 cups fresh spinach",
        "Italian seasoning to taste",
        "Salt and pepper",
      ],
      instructions: [
        "Season shrimp with salt, pepper, and Italian seasoning",
        "Cook shrimp in olive oil for 2 minutes per side, set aside",
        "Sauté garlic until fragrant (30 seconds)",
        "Add heavy cream and bring to a simmer",
        "Stir in parmesan until melted",
        "Add sun-dried tomatoes and spinach",
        "Return shrimp to pan and coat with sauce",
        "Serve over pasta or rice!",
      ],
      calories: 380,
    });
    setIsExtracting(false);
  };

  const handleSave = () => {
    // In real app, would save to database
    router.push("/recipe/extracted-1");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        {!extractedRecipe ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-bold text-charcoal">
                {isExtracting ? "Extracting Recipe..." : "Extract Recipe"}
              </h2>
              {!isExtracting && (
                <button onClick={onClose} className="text-muted-foreground hover:text-charcoal text-2xl">
                  ×
                </button>
              )}
            </div>

            {isExtracting ? (
              <div className="py-12 text-center">
                <div className="text-6xl mb-6 animate-bounce">🎬</div>
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-coral rounded-full animate-pulse" />
                    <span className="text-muted-foreground">Fetching video content...</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-lime rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                    <span className="text-muted-foreground">Analyzing ingredients...</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-sunny rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                    <span className="text-muted-foreground">Generating recipe...</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <label className="font-bold text-charcoal mb-2 block">Paste video URL</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://tiktok.com/... or instagram.com/reel/..."
                    className="w-full p-4 border-2 border-border rounded-xl focus:outline-none focus:border-coral transition-colors"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Supports TikTok, Instagram Reels, and YouTube Shorts
                  </p>
                </div>

                <div className="flex gap-3 mb-4">
                  <div className="flex-1 p-3 bg-muted/30 rounded-xl text-center">
                    <div className="text-2xl mb-1">🎵</div>
                    <div className="text-xs text-muted-foreground">TikTok</div>
                  </div>
                  <div className="flex-1 p-3 bg-muted/30 rounded-xl text-center">
                    <div className="text-2xl mb-1">📷</div>
                    <div className="text-xs text-muted-foreground">Instagram</div>
                  </div>
                  <div className="flex-1 p-3 bg-muted/30 rounded-xl text-center">
                    <div className="text-2xl mb-1">▶️</div>
                    <div className="text-xs text-muted-foreground">YouTube</div>
                  </div>
                </div>

                <Button
                  onClick={handleExtract}
                  disabled={!url.trim()}
                  className="w-full gradient-coral text-white font-bold text-lg py-6 disabled:opacity-50"
                >
                  Extract Recipe
                </Button>
              </>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-bold text-charcoal">Recipe Extracted!</h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-charcoal text-2xl">
                ×
              </button>
            </div>

            <div className="mb-4 p-4 bg-coral/10 rounded-2xl border-2 border-coral/30">
              <div className="text-center mb-2">
                <span className="text-4xl">🎉</span>
              </div>
              <h3 className="font-display text-xl font-bold text-charcoal text-center mb-1">
                {extractedRecipe.name}
              </h3>
              <p className="text-xs text-muted-foreground text-center">
                by {extractedRecipe.creator}
              </p>
              <p className="text-sm text-muted-foreground text-center mt-2">
                {extractedRecipe.description}
              </p>
            </div>

            <div className="mb-4">
              <h4 className="font-bold text-charcoal mb-2">Ingredients ({extractedRecipe.ingredients.length})</h4>
              <div className="bg-muted/20 rounded-xl p-3 max-h-32 overflow-y-auto">
                <ul className="text-sm space-y-1">
                  {extractedRecipe.ingredients.map((ing, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-coral rounded-full" />
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-bold text-charcoal mb-2">Instructions ({extractedRecipe.instructions.length} steps)</h4>
              <div className="bg-muted/20 rounded-xl p-3 max-h-32 overflow-y-auto">
                <ol className="text-sm space-y-2">
                  {extractedRecipe.instructions.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-bold text-coral shrink-0">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setExtractedRecipe(null)} className="flex-1 border-2">
                Try Another
              </Button>
              <Button onClick={handleSave} className="flex-1 gradient-coral text-white font-bold">
                Save Recipe
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// Photo to Recipe Modal
function PhotoRecipeModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [hasPhoto, setHasPhoto] = useState(false);
  const [dishName, setDishName] = useState("");
  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 2500));
    // In real app, would generate recipe
    router.push("/recipe/photo-generated-1");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-bold text-charcoal">
            {isGenerating ? "Creating Recipe..." : "Recipe from Photo"}
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
            <p className="text-muted-foreground">Analyzing your photo and creating a recipe...</p>
          </div>
        ) : (
          <>
            <div
              onClick={() => setHasPhoto(true)}
              className={`border-2 border-dashed rounded-2xl p-6 text-center mb-4 cursor-pointer transition-all ${
                hasPhoto ? "border-lime bg-lime/10" : "border-lime/30 hover:border-lime"
              }`}
            >
              {hasPhoto ? (
                <>
                  <div className="text-5xl mb-2">✓</div>
                  <p className="font-bold text-lime">Photo uploaded!</p>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-3">📸</div>
                  <p className="font-bold text-charcoal mb-1">Upload a meal photo</p>
                  <p className="text-sm text-muted-foreground">We&apos;ll create a recipe so you can remake it!</p>
                </>
              )}
            </div>

            <div className="mb-4">
              <label className="font-bold text-charcoal mb-2 block">What is this dish? (optional)</label>
              <input
                type="text"
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                placeholder="E.g., Mom's lasagna, Restaurant pasta..."
                className="w-full p-3 border-2 border-border rounded-xl focus:outline-none focus:border-lime"
              />
            </div>

            <div className="mb-6">
              <label className="font-bold text-charcoal mb-2 block">Any notes?</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g., It was really creamy, had a smoky flavor..."
                className="w-full p-3 border-2 border-border rounded-xl resize-none h-20 focus:outline-none focus:border-lime"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!hasPhoto}
              className="w-full gradient-lime text-white font-bold text-lg py-6 disabled:opacity-50"
            >
              Generate Recipe
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}

export default function SavedPage() {
  const router = useRouter();
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [extractUrl, setExtractUrl] = useState("");
  const savedRecipes = dummyRecipes.filter((r) => r.isSaved);
  const madeRecipes = dummyRecipes.filter((r) => r.madeCount && r.madeCount > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-hero border-b border-border/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-pink/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-lime/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        <div className="max-w-4xl mx-auto px-4 py-4 relative">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/")}
              className="text-muted-foreground hover:text-coral font-bold"
            >
              ← Back
            </Button>
            <div className="flex-1">
              <h1 className="font-display text-2xl font-bold text-charcoal">My Recipes</h1>
            </div>
            <MahmLogo size="sm" showText={false} />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Quick Actions */}
        <div className="flex gap-3 mb-6">
          <Button
            onClick={() => setShowPhotoModal(true)}
            className="flex-1 gradient-lime text-white font-bold py-6 shadow-playful-lime hover:scale-105 transition-transform"
          >
            <span className="text-xl mr-2">📸</span> Recipe from Photo
          </Button>
          <Button
            onClick={() => setShowExtractModal(true)}
            className="flex-1 gradient-coral text-white font-bold py-6 shadow-playful hover:scale-105 transition-transform"
          >
            <span className="text-xl mr-2">🎬</span> Extract from Video
          </Button>
        </div>

        <Tabs defaultValue="saved" className="w-full">
          <TabsList className="bg-white border-2 border-coral/20 p-1 mb-6 shadow-playful">
            <TabsTrigger
              value="saved"
              className="data-[state=active]:bg-coral/10 data-[state=active]:text-coral font-display font-bold"
            >
              ♥ Saved ({savedRecipes.length})
            </TabsTrigger>
            <TabsTrigger
              value="made"
              className="data-[state=active]:bg-coral/10 data-[state=active]:text-coral font-display font-bold"
            >
              👩‍🍳 Made ({madeRecipes.length})
            </TabsTrigger>
            <TabsTrigger
              value="inspiration"
              className="data-[state=active]:bg-coral/10 data-[state=active]:text-coral font-display font-bold"
            >
              ✨ Inspiration
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
                  value={extractUrl}
                  onChange={(e) => setExtractUrl(e.target.value)}
                  placeholder="Paste a TikTok, Instagram Reel, or YouTube Short URL..."
                  className="flex-1 px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-coral/50"
                />
                <Button
                  onClick={() => {
                    if (extractUrl.trim()) {
                      setShowExtractModal(true);
                    }
                  }}
                  className="gradient-coral text-white px-6"
                >
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
                  onClick={() => {
                    if (!content.recipeId) {
                      setExtractUrl(content.url);
                      setShowExtractModal(true);
                    } else {
                      router.push(`/recipe/${content.recipeId}`);
                    }
                  }}
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
                      <span className="ml-2 text-xs text-coral font-medium">
                        Extract recipe →
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals */}
      {showExtractModal && (
        <ExtractRecipeModal
          onClose={() => {
            setShowExtractModal(false);
            setExtractUrl("");
          }}
          initialUrl={extractUrl}
        />
      )}
      {showPhotoModal && (
        <PhotoRecipeModal onClose={() => setShowPhotoModal(false)} />
      )}
    </div>
  );
}
