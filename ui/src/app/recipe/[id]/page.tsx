"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NutritionBadge } from "@/components/recipe/NutritionBadge";
import { dummyRecipes, dummyJournalEntries } from "@/lib/dummy-data";
import { CartItem, Ingredient } from "@/types";

interface SelectedStore {
  ingredientName: string;
  storeId: string;
  storeName: string;
  price: number;
}

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
  const [selectedStores, setSelectedStores] = useState<Record<string, SelectedStore>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const selectStore = (ingredient: Ingredient, storeId: string, storeName: string, price: number) => {
    setSelectedStores(prev => {
      if (prev[ingredient.name]?.storeId === storeId) {
        const newSelections = { ...prev };
        delete newSelections[ingredient.name];
        return newSelections;
      }
      return {
        ...prev,
        [ingredient.name]: { ingredientName: ingredient.name, storeId, storeName, price }
      };
    });
  };

  const addToCart = (ingredient: Ingredient) => {
    const selection = selectedStores[ingredient.name];
    if (!selection) return;

    const existingIndex = cart.findIndex(
      item => item.ingredient === ingredient.name && item.storeId === selection.storeId
    );

    if (existingIndex >= 0) {
      setCart(prev => prev.map((item, idx) =>
        idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      const newItem: CartItem = {
        id: `${ingredient.name}-${selection.storeId}`,
        ingredient: ingredient.name,
        storeId: selection.storeId,
        storeName: selection.storeName,
        price: selection.price,
        quantity: 1,
        unit: ingredient.unit,
        recipeId: recipe?.id,
        recipeName: recipe?.name
      };
      setCart(prev => [...prev, newItem]);
    }

    setSelectedStores(prev => {
      const newSelections = { ...prev };
      delete newSelections[ingredient.name];
      return newSelections;
    });
  };

  const addAllSelected = () => {
    Object.keys(selectedStores).forEach(ingredientName => {
      const ingredient = recipe?.ingredients.find(i => i.name === ingredientName);
      if (ingredient) {
        addToCart(ingredient);
      }
    });
  };

  const selectAllCheapest = () => {
    if (!recipe) return;
    const newSelections: Record<string, SelectedStore> = {};
    recipe.ingredients.forEach(ing => {
      if (ing.storeOptions && ing.storeOptions.length > 0) {
        const cheapest = ing.storeOptions
          .filter(s => s.inStock)
          .reduce((min, s) => s.price < min.price ? s : min, ing.storeOptions.filter(s => s.inStock)[0]);
        if (cheapest) {
          newSelections[ing.name] = {
            ingredientName: ing.name,
            storeId: cheapest.storeId,
            storeName: cheapest.storeName,
            price: cheapest.price
          };
        }
      }
    });
    setSelectedStores(newSelections);
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const cartByStore = cart.reduce((acc, item) => {
    if (!acc[item.storeId]) {
      acc[item.storeId] = { name: item.storeName, items: [], subtotal: 0 };
    }
    acc[item.storeId].items.push(item);
    acc[item.storeId].subtotal += item.price * item.quantity;
    return acc;
  }, {} as Record<string, { name: string; items: CartItem[]; subtotal: number }>);

  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Recipe not found</h1>
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
              className="text-muted-foreground hover:text-foreground"
            >
              ← Back
            </Button>
            <div className="flex-1" />
            <Button
              variant={isSaved ? "default" : "outline"}
              onClick={() => setIsSaved(!isSaved)}
              className={isSaved ? "bg-primary text-white" : "border-primary text-primary"}
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
              <h1 className="text-3xl font-bold text-foreground mb-2">{recipe.name}</h1>
              <p className="text-muted-foreground">{recipe.description}</p>
            </div>
            {recipe.madeCount && recipe.madeCount > 0 && (
              <Badge className="bg-accent/20 text-foreground border-0 shrink-0">
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
            <Badge variant="secondary" className="bg-accent/20 text-foreground border-0">
              {recipe.difficulty}
            </Badge>
          </div>

          {/* Dietary Tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            {recipe.dietaryTags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="bg-primary-light/30 text-foreground border-primary/20"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Cost Banner */}
        <Card className="p-4 mb-6 border-accent/30 bg-accent/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Estimated cost</div>
              <div className="text-2xl font-bold text-foreground">
                ${totalCost.toFixed(2)}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (${(totalCost / recipe.servings).toFixed(2)}/serving)
                </span>
              </div>
              <div className="text-sm text-accent mt-1">
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
            <TabsTrigger value="ingredients" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              Ingredients
            </TabsTrigger>
            <TabsTrigger value="instructions" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              Instructions
            </TabsTrigger>
            <TabsTrigger value="nutrition" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              Nutrition
            </TabsTrigger>
            {journalEntries.length > 0 && (
              <TabsTrigger value="history" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                My History ({journalEntries.length})
              </TabsTrigger>
            )}
          </TabsList>

          {/* Ingredients Tab */}
          <TabsContent value="ingredients" className="mt-4">
            <Card className="p-4">
              {/* Quick Actions */}
              {recipe.ingredients.some((ing) => ing.storeOptions) && (
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/50">
                  <p className="text-sm text-muted-foreground">
                    Click on stores to select, then add to cart
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllCheapest}
                      className="text-accent border-accent/30 hover:bg-accent/10"
                    >
                      Select Cheapest
                    </Button>
                    {Object.keys(selectedStores).length > 0 && (
                      <Button
                        size="sm"
                        onClick={addAllSelected}
                        className="gradient-coral text-white"
                      >
                        Add {Object.keys(selectedStores).length} to Cart
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {recipe.ingredients.map((ing, idx) => {
                  const isInCart = cart.some(item => item.ingredient === ing.name);
                  const isSelected = !!selectedStores[ing.name];
                  const cheapestPrice = ing.storeOptions
                    ? Math.min(...ing.storeOptions.filter(s => s.inStock).map(s => s.price))
                    : ing.price || 0;

                  return (
                    <div
                      key={idx}
                      className={`rounded-xl p-4 transition-all ${
                        isInCart ? "bg-accent/10 border border-accent/30" : isSelected ? "bg-primary/5 border border-primary/30" : "bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" className="w-5 h-5 rounded border-border accent-coral" />
                          <div>
                            <span className="font-medium text-foreground">{ing.name}</span>
                            <span className="text-muted-foreground ml-2">
                              {ing.amount} {ing.unit}
                            </span>
                            {ing.notes && (
                              <span className="text-sm text-muted-foreground ml-2">({ing.notes})</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isInCart && (
                            <Badge className="bg-accent/20 text-accent border-0 text-xs">
                              In Cart
                            </Badge>
                          )}
                          {isSelected && (
                            <Button
                              size="sm"
                              onClick={() => addToCart(ing)}
                              className="gradient-coral text-white text-xs h-7 px-3"
                            >
                              + Add
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Store Options */}
                      {ing.storeOptions && ing.storeOptions.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-3 ml-8">
                          {ing.storeOptions.map((store, sIdx) => {
                            const isCheapest = store.price === cheapestPrice && store.inStock;
                            const isStoreSelected = selectedStores[ing.name]?.storeId === store.storeId;
                            const isDisabled = !store.inStock;

                            return (
                              <button
                                key={sIdx}
                                onClick={() => !isDisabled && selectStore(ing, store.storeId, store.storeName, store.price)}
                                disabled={isDisabled}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                                  isStoreSelected
                                    ? "bg-primary text-white ring-2 ring-coral ring-offset-2"
                                    : isCheapest
                                    ? "bg-accent/20 border border-accent/30 hover:bg-accent/30"
                                    : "bg-white hover:bg-muted/50"
                                } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                              >
                                <span className={isStoreSelected ? "text-white" : ""}>{store.storeName}</span>
                                <span className={`font-bold ${isStoreSelected ? "text-white" : isCheapest ? "text-accent" : "text-foreground"}`}>
                                  ${store.price.toFixed(2)}
                                </span>
                                {isCheapest && !isStoreSelected && (
                                  <Badge className="bg-accent text-white text-xs px-1.5 py-0">Best</Badge>
                                )}
                                {!store.inStock && (
                                  <Badge variant="outline" className="text-xs text-muted-foreground">Out</Badge>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-right ml-8">
                          <div className="font-medium">${ing.price?.toFixed(2) || "—"}</div>
                          {ing.cheapestStore && (
                            <div className="text-xs text-accent">{ing.cheapestStore}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Floating Cart Summary */}
            {cart.length > 0 && (
              <Card className="mt-4 overflow-hidden">
                <button
                  onClick={() => setShowCart(!showCart)}
                  className="w-full p-4 bg-cream/50 flex items-center justify-between hover:bg-cream transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full gradient-coral flex items-center justify-center text-white text-lg">
                      🛍️
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-foreground">Shopping Cart</h3>
                      <p className="text-sm text-muted-foreground">
                        {cartItemCount} item{cartItemCount !== 1 ? "s" : ""} from {Object.keys(cartByStore).length} store{Object.keys(cartByStore).length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">${cartTotal.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">estimated</div>
                    </div>
                    <span className={`text-muted-foreground transition-transform ${showCart ? "rotate-180" : ""}`}>
                      ▼
                    </span>
                  </div>
                </button>

                {showCart && (
                  <div className="p-4 border-t border-border/50">
                    <div className="space-y-4">
                      {Object.entries(cartByStore).map(([storeId, storeData]) => (
                        <div key={storeId} className="bg-muted/30 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-foreground">{storeData.name}</h4>
                            <div className="text-sm font-medium text-primary">
                              ${storeData.subtotal.toFixed(2)}
                            </div>
                          </div>
                          <div className="space-y-2">
                            {storeData.items.map(item => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between bg-white rounded-lg p-2"
                              >
                                <div className="flex-1">
                                  <div className="font-medium text-foreground text-sm">{item.ingredient}</div>
                                  <div className="text-xs text-muted-foreground">
                                    ${item.price.toFixed(2)} each
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => updateQuantity(item.id, -1)}
                                    className="w-7 h-7 rounded-full bg-muted/50 text-foreground hover:bg-muted flex items-center justify-center"
                                  >
                                    -
                                  </button>
                                  <span className="w-8 text-center font-medium text-foreground">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => updateQuantity(item.id, 1)}
                                    className="w-7 h-7 rounded-full bg-muted/50 text-foreground hover:bg-muted flex items-center justify-center"
                                  >
                                    +
                                  </button>
                                  <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="w-7 h-7 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center ml-2"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-muted-foreground">Estimated Total</span>
                        <span className="text-2xl font-bold text-primary">${cartTotal.toFixed(2)}</span>
                      </div>
                      <Button className="w-full gradient-coral text-white" size="lg">
                        Proceed to Checkout
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}
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
                      <p className="text-foreground">{step}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          </TabsContent>

          {/* Nutrition Tab */}
          <TabsContent value="nutrition" className="mt-4">
            <Card className="p-4">
              <h3 className="font-semibold text-foreground mb-4">Per serving</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-primary/10 rounded-xl">
                  <div className="text-3xl font-bold text-primary">{recipe.nutrition.calories}</div>
                  <div className="text-sm text-muted-foreground">Calories</div>
                </div>
                <div className="text-center p-4 bg-accent/10 rounded-xl">
                  <div className="text-3xl font-bold text-accent">{recipe.nutrition.protein}g</div>
                  <div className="text-sm text-muted-foreground">Protein</div>
                </div>
                <div className="text-center p-4 bg-sunny/20 rounded-xl">
                  <div className="text-3xl font-bold text-foreground">{recipe.nutrition.carbs}g</div>
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
                    {entry.notes && <p className="text-foreground mb-2">{entry.notes}</p>}
                    {entry.modifications && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Modifications:</span> {entry.modifications}
                      </p>
                    )}
                    {entry.wouldMakeAgain && (
                      <Badge className="mt-2 bg-accent/20 text-foreground border-0">
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
            className="border-accent text-accent hover:bg-accent/10 flex-1 sm:flex-none"
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
            <h2 className="text-xl font-bold text-foreground mb-4">How did it go?</h2>

            {/* Rating */}
            <div className="mb-4">
              <label className="text-sm font-medium text-foreground mb-2 block">Rating</label>
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
              <label className="text-sm font-medium text-foreground mb-2 block">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How did it taste? Any tips for next time?"
                className="w-full p-3 border border-border rounded-lg resize-none h-20 focus:outline-none focus:ring-2 focus:ring-coral/50"
              />
            </div>

            {/* Modifications */}
            <div className="mb-6">
              <label className="text-sm font-medium text-foreground mb-2 block">
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
              <label className="text-sm font-medium text-foreground mb-2 block">Add a photo</label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-muted-foreground hover:border-primary/50 cursor-pointer transition-colors">
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
