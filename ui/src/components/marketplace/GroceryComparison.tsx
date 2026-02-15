"use client";

import { useState, useEffect } from "react";
import { GroceryComparison as GroceryComparisonType, CartItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMahm } from "@/contexts/MahmContext";

interface GroceryComparisonProps {
  comparisons: GroceryComparisonType[];
  groceryListItems?: string[]; // Items from the meal plan grocery list
}

export function GroceryComparison({ comparisons, groceryListItems = [] }: GroceryComparisonProps) {
  const { cart: contextCart, addToCart: contextAddToCart, removeFromCart: contextRemoveFromCart, updateCartQuantity, syncCartToGroceryList } = useMahm();
  const [selectedStores, setSelectedStores] = useState<Record<string, string>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [findingStores, setFindingStores] = useState(false);
  const [storesFound, setStoresFound] = useState(false);

  // Use context cart instead of local state
  const cart = contextCart;

  // Sync cart to grocery list whenever cart changes
  useEffect(() => {
    syncCartToGroceryList();
  }, [cart, syncCartToGroceryList]);

  const handleFindStores = async () => {
    setFindingStores(true);
    // Simulate finding stores
    await new Promise(resolve => setTimeout(resolve, 1500));
    setFindingStores(false);
    setStoresFound(true);
  };

  const selectStore = (ingredient: string, storeId: string) => {
    setSelectedStores(prev => ({
      ...prev,
      [ingredient]: prev[ingredient] === storeId ? "" : storeId
    }));
  };

  const addToCart = (comparison: GroceryComparisonType) => {
    const selectedStoreId = selectedStores[comparison.ingredient];
    if (!selectedStoreId) return;

    const storeOption = comparison.stores.find(s => s.store.id === selectedStoreId);
    if (!storeOption || !storeOption.inStock) return;

    // Check if already in cart
    const existingItem = cart.find(
      item => item.ingredient === comparison.ingredient && item.storeId === selectedStoreId
    );

    if (existingItem) {
      // Update quantity using context
      updateCartQuantity(existingItem.id, existingItem.quantity + 1);
    } else {
      // Add new item using context
      const newItem: CartItem = {
        id: `${comparison.ingredient}-${selectedStoreId}`,
        ingredient: comparison.ingredient,
        storeId: selectedStoreId,
        storeName: storeOption.store.name,
        price: storeOption.price,
        quantity: 1,
        unit: "item"
      };
      contextAddToCart(newItem);
    }

    // Clear selection
    setSelectedStores(prev => ({ ...prev, [comparison.ingredient]: "" }));
  };

  const removeFromCart = (itemId: string) => {
    contextRemoveFromCart(itemId);
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    const item = cart.find(i => i.id === itemId);
    if (item) {
      const newQuantity = Math.max(0, item.quantity + delta);
      if (newQuantity === 0) {
        contextRemoveFromCart(itemId);
      } else {
        updateCartQuantity(itemId, newQuantity);
      }
    }
  };

  // Filter comparisons to only show items in grocery list (if provided)
  const filteredComparisons = groceryListItems.length > 0
    ? comparisons.filter(c => groceryListItems.some(item =>
        item.toLowerCase().includes(c.ingredient.toLowerCase()) ||
        c.ingredient.toLowerCase().includes(item.toLowerCase())
      ))
    : comparisons;

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Group cart by store
  const cartByStore = cart.reduce((acc, item) => {
    if (!acc[item.storeId]) {
      acc[item.storeId] = { name: item.storeName, items: [], subtotal: 0 };
    }
    acc[item.storeId].items.push(item);
    acc[item.storeId].subtotal += item.price * item.quantity;
    return acc;
  }, {} as Record<string, { name: string; items: CartItem[]; subtotal: number }>);

  const selectCheapest = () => {
    const newSelections: Record<string, string> = {};
    comparisons.forEach(comparison => {
      const cheapest = comparison.stores.find(s => s.isCheapest && s.inStock);
      if (cheapest) {
        newSelections[comparison.ingredient] = cheapest.store.id;
      }
    });
    setSelectedStores(newSelections);
  };

  const addAllSelected = () => {
    comparisons.forEach(comparison => {
      if (selectedStores[comparison.ingredient]) {
        addToCart(comparison);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Comparison Card */}
      <div className="bg-white rounded-2xl border border-border/50 overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-cream/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <span>🛒</span> Price Comparison
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Click on a store to select, then add to cart
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectCheapest}
                className="text-accent border-accent/30 hover:bg-accent/10"
              >
                Select All Cheapest
              </Button>
              {Object.values(selectedStores).filter(Boolean).length > 0 && (
                <Button
                  size="sm"
                  onClick={addAllSelected}
                  className="gradient-coral text-white"
                >
                  Add Selected to Cart
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="divide-y divide-border/30">
          {filteredComparisons.map((comparison, idx) => {
            const selectedStoreId = selectedStores[comparison.ingredient];
            const isInCart = cart.some(item => item.ingredient === comparison.ingredient);

            return (
              <div key={idx} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-foreground flex items-center gap-2">
                    {comparison.ingredient}
                    {isInCart && (
                      <Badge className="bg-primary/20 text-primary border-0 text-xs">
                        In Cart
                      </Badge>
                    )}
                  </div>
                  {selectedStoreId && (
                    <Button
                      size="sm"
                      onClick={() => addToCart(comparison)}
                      className="gradient-coral text-white text-xs px-3 py-1 h-7"
                    >
                      + Add to Cart
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  {comparison.stores.map((storePrice, sIdx) => {
                    const isSelected = selectedStoreId === storePrice.store.id;
                    const isDisabled = !storePrice.inStock;
                    const priceStr = storePrice.linePriceDisplay ?? (storePrice.price != null && storePrice.price > 0 ? `$${storePrice.price.toFixed(2)}` : null);

                    return (
                      <button
                        key={sIdx}
                        onClick={() => !isDisabled && selectStore(comparison.ingredient, storePrice.store.id)}
                        disabled={isDisabled}
                        className={`flex items-stretch gap-3 rounded-xl border-2 p-3 text-left transition-all w-full max-w-sm ${
                          isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-2"
                            : storePrice.isCheapest
                            ? "border-accent/50 bg-accent/10 hover:bg-accent/20"
                            : "border-border bg-muted/30 hover:bg-muted/50"
                        } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {storePrice.image && (
                          <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-muted">
                            <img src={storePrice.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-bold ${isSelected ? "text-primary" : ""}`}>
                              {storePrice.store.name}
                            </span>
                            {storePrice.isCheapest && !isSelected && (
                              <Badge className="bg-accent text-white text-xs">Best</Badge>
                            )}
                            {!storePrice.inStock && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">Out</Badge>
                            )}
                          </div>
                          {storePrice.productName && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {storePrice.productName}
                            </p>
                          )}
                          <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
                            {priceStr && (
                              <span className={`font-bold text-lg ${isSelected ? "text-primary" : storePrice.isCheapest ? "text-accent" : "text-foreground"}`}>
                                {priceStr}
                              </span>
                            )}
                            {storePrice.unitPrice && (
                              <span className="text-xs text-muted-foreground">{storePrice.unitPrice}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shopping Cart */}
      <Card className="overflow-hidden">
        <button
          onClick={() => setIsCartOpen(!isCartOpen)}
          className="w-full p-4 bg-cream/50 flex items-center justify-between hover:bg-cream transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-coral flex items-center justify-center text-white text-lg">
              🛍️
            </div>
            <div className="text-left">
              <h3 className="font-bold text-foreground">Shopping Cart</h3>
              <p className="text-sm text-muted-foreground">
                {cartItemCount === 0
                  ? "Your cart is empty"
                  : `${cartItemCount} item${cartItemCount !== 1 ? "s" : ""} from ${Object.keys(cartByStore).length} store${Object.keys(cartByStore).length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xl font-bold text-primary">${cartTotal.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">estimated total</div>
            </div>
            <span className={`text-muted-foreground transition-transform ${isCartOpen ? "rotate-180" : ""}`}>
              ▼
            </span>
          </div>
        </button>

        {isCartOpen && cart.length > 0 && (
          <div className="p-4 border-t border-border/50">
            {/* Cart items by store */}
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
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            className="w-7 h-7 rounded-full bg-muted/50 text-foreground hover:bg-muted flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-medium text-foreground">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, 1)}
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

            {/* Checkout Button */}
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-muted-foreground">Estimated Total</span>
                <span className="text-2xl font-bold text-primary">${cartTotal.toFixed(2)}</span>
              </div>
              <Button className="w-full gradient-coral text-white" size="lg">
                Proceed to Checkout
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                You'll be redirected to complete your purchase at each store
              </p>
            </div>
          </div>
        )}

        {isCartOpen && cart.length === 0 && (
          <div className="p-8 text-center">
            <div className="text-4xl mb-3">🛒</div>
            <p className="text-muted-foreground">
              Select ingredients above to add them to your cart
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
