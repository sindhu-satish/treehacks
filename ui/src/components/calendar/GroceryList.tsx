"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface GroceryItem {
  name: string;
  amount: string;
  category: string;
  estimatedPrice?: number;
  recipeNames?: string[];
  inCart?: boolean;
  alreadyHave?: boolean;
  haveQuantity?: number; // How much the user already has (0-100%)
  selectedStoreName?: string;
  selectedPrice?: number;
}

interface GroceryListProps {
  items: GroceryItem[];
  totalCost: number;
  onToggleHave?: (itemName: string) => void;
  onUpdateHaveQuantity?: (itemName: string, quantity: number) => void;
  onAddToCart?: (item: GroceryItem) => void;
}

const categoryIcons: Record<string, string> = {
  produce: "🥬",
  protein: "🥩",
  dairy: "🥛",
  grains: "🌾",
  canned: "🥫",
  spices: "🧂",
  frozen: "🧊",
  other: "📦",
};

export function GroceryList({ items, totalCost, onToggleHave, onUpdateHaveQuantity, onAddToCart }: GroceryListProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [showHaveItems, setShowHaveItems] = useState(false);
  const [haveQuantities, setHaveQuantities] = useState<Record<string, number>>({});
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [markHaveMode, setMarkHaveMode] = useState(false);

  // Group by category
  const grouped = items.reduce((acc, item) => {
    const cat = item.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, GroceryItem[]>);

  const toggleChecked = (itemName: string) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
        // Reset quantity when unchecking
        setHaveQuantities(prev => {
          const newQuantities = { ...prev };
          delete newQuantities[itemName];
          return newQuantities;
        });
      } else {
        newSet.add(itemName);
        // Default to 100% when checking
        setHaveQuantities(prev => ({ ...prev, [itemName]: 100 }));
      }
      return newSet;
    });
    if (onToggleHave) {
      onToggleHave(itemName);
    }
  };

  const updateQuantity = (itemName: string, quantity: number) => {
    setHaveQuantities(prev => ({ ...prev, [itemName]: quantity }));
    if (onUpdateHaveQuantity) {
      onUpdateHaveQuantity(itemName, quantity);
    }
  };

  const getItemStatus = (item: GroceryItem) => {
    const haveQty = haveQuantities[item.name] || (item.alreadyHave ? 100 : 0);
    if (haveQty === 100) return "full";
    if (haveQty > 0) return "partial";
    return "none";
  };

  const activeItems = items.filter(i => !checkedItems.has(i.name) && !i.alreadyHave);
  const haveItems = items.filter(i => checkedItems.has(i.name) || i.alreadyHave);
  const inCartItems = items.filter(i => i.inCart);
  const partialHaveItems = items.filter(i => {
    const qty = haveQuantities[i.name] || 0;
    return qty > 0 && qty < 100;
  });

  const activeTotal = activeItems.reduce((sum, item) => {
    const haveQty = haveQuantities[item.name] || 0;
    const neededPercent = (100 - haveQty) / 100;
    return sum + (item.selectedPrice || item.estimatedPrice || 0) * neededPercent;
  }, 0);

  return (
    <Card className="p-4 border-2 border-primary/20 shadow-playful">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-foreground flex items-center gap-2 text-lg">
            <span>🛍️</span> Weekly Grocery List
          </h3>
          <p className="text-xs text-muted-foreground">
            Based on your meal plan for this week
          </p>
        </div>
        <div className="text-right">
          <Badge className="bg-primary text-white font-bold">
            {activeItems.length} items
          </Badge>
          <div className="text-lg font-bold text-primary mt-1">
            ~${activeTotal.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 p-2 bg-accent/10 rounded-lg text-center">
          <div className="font-bold text-accent text-lg">{inCartItems.length}</div>
          <div className="text-xs text-muted-foreground">In Cart</div>
        </div>
        <div className="flex-1 p-2 bg-amber-400/20 rounded-lg text-center">
          <div className="font-bold text-foreground text-lg">{haveItems.length}</div>
          <div className="text-xs text-muted-foreground">Already Have</div>
        </div>
        <div className="flex-1 p-2 bg-violet-500/10 rounded-lg text-center">
          <div className="font-bold text-violet-500 text-lg">{partialHaveItems.length}</div>
          <div className="text-xs text-muted-foreground">Partial</div>
        </div>
        <div className="flex-1 p-2 bg-primary/10 rounded-lg text-center">
          <div className="font-bold text-primary text-lg">{activeItems.length - inCartItems.length}</div>
          <div className="text-xs text-muted-foreground">To Buy</div>
        </div>
      </div>

      {/* Mark Have Mode Toggle */}
      <div className="mb-3">
        <button
          onClick={() => setMarkHaveMode(!markHaveMode)}
          className={`w-full p-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            markHaveMode
              ? "bg-accent text-white"
              : "bg-accent/10 text-accent border-2 border-accent/30 hover:bg-accent/20"
          }`}
        >
          <span>{markHaveMode ? "✓ Marking Items" : "🏠 Mark What You Have"}</span>
          {markHaveMode && <span className="text-xs font-normal">(click items below)</span>}
        </button>
      </div>

      {/* Toggle for "Already Have" items */}
      {haveItems.length > 0 && (
        <button
          onClick={() => setShowHaveItems(!showHaveItems)}
          className="w-full p-2 mb-3 bg-muted/30 rounded-lg text-sm text-muted-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
        >
          {showHaveItems ? "Hide" : "Show"} {haveItems.length} items you already have
          <span className={`transition-transform ${showHaveItems ? "rotate-180" : ""}`}>▼</span>
        </button>
      )}

      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {Object.entries(grouped).map(([category, categoryItems]) => {
          const visibleItems = showHaveItems
            ? categoryItems
            : categoryItems.filter(i => !checkedItems.has(i.name) && !i.alreadyHave);

          if (visibleItems.length === 0) return null;

          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2 sticky top-0 bg-white py-1 z-10">
                <span className="text-lg">{categoryIcons[category] || "📦"}</span>
                <span className="text-sm font-bold text-foreground capitalize">
                  {category}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({visibleItems.length})
                </span>
              </div>
              <div className="space-y-2 pl-6">
                {visibleItems.map((item, idx) => {
                  const isHave = checkedItems.has(item.name) || item.alreadyHave;
                  const haveQty = haveQuantities[item.name] ?? (item.haveQuantity || (isHave ? 100 : 0));
                  const isPartial = haveQty > 0 && haveQty < 100;
                  const isEditing = editingItem === item.name;

                  return (
                    <div
                      key={idx}
                      className={`rounded-xl transition-all ${
                        isHave && haveQty === 100
                          ? "bg-accent/10 border-2 border-accent/30"
                          : isPartial
                          ? "bg-violet-500/10 border-2 border-violet-500/30"
                          : item.inCart
                          ? "bg-amber-400/10 border-2 border-amber-400/30"
                          : markHaveMode
                          ? "bg-muted/30 border-2 border-dashed border-accent/30 cursor-pointer hover:bg-accent/10"
                          : "bg-muted/30 border-2 border-transparent"
                      }`}
                      onClick={() => {
                        if (markHaveMode && !isHave) {
                          toggleChecked(item.name);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between text-sm p-3">
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="checkbox"
                            checked={isHave}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleChecked(item.name);
                            }}
                            className="w-4 h-4 rounded border-border accent-lime"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-medium ${isHave && haveQty === 100 ? "line-through text-muted-foreground" : ""}`}>
                                {item.name}
                              </span>
                              <span className="text-muted-foreground">({item.amount})</span>
                              {item.inCart && (
                                <Badge className="bg-amber-400/30 text-foreground border-0 text-xs">In Cart</Badge>
                              )}
                              {isHave && haveQty === 100 && (
                                <Badge className="bg-accent/30 text-accent border-0 text-xs">Have All</Badge>
                              )}
                              {isPartial && (
                                <Badge className="bg-violet-500/30 text-violet-500 border-0 text-xs">Have {haveQty}%</Badge>
                              )}
                            </div>
                            {item.recipeNames && item.recipeNames.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                For: {item.recipeNames.join(", ")}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right shrink-0">
                            {item.selectedPrice ? (
                              <div>
                                <div className="font-bold text-accent">${(item.selectedPrice * (100 - haveQty) / 100).toFixed(2)}</div>
                                <div className="text-xs text-muted-foreground">{item.selectedStoreName}</div>
                              </div>
                            ) : item.estimatedPrice ? (
                              <span className="text-muted-foreground font-medium">
                                ~${(item.estimatedPrice * (100 - haveQty) / 100).toFixed(2)}
                              </span>
                            ) : null}
                          </div>
                          {(isHave || isPartial) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingItem(isEditing ? null : item.name);
                              }}
                              className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-500 hover:bg-violet-500/30 flex items-center justify-center text-xs"
                            >
                              {isEditing ? "×" : "⚙"}
                            </button>
                          )}
                          {!item.inCart && !isHave && onAddToCart && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddToCart(item);
                              }}
                              className="w-6 h-6 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors flex items-center justify-center text-sm"
                            >
                              +
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Quantity Slider (when editing or partial) */}
                      {isEditing && (
                        <div className="px-3 pb-3 pt-1 border-t border-border/30 mt-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                            <span>How much do you have?</span>
                            <span className="font-bold text-foreground">{haveQty}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="10"
                            value={haveQty}
                            onChange={(e) => updateQuantity(item.name, parseInt(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full h-2 rounded-full appearance-none bg-muted/50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:cursor-pointer"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>None</span>
                            <span>Half</span>
                            <span>All</span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(item.name, 0);
                                toggleChecked(item.name);
                                setEditingItem(null);
                              }}
                              className="flex-1 py-1.5 text-xs font-bold bg-primary/10 text-primary rounded-lg hover:bg-primary/20"
                            >
                              Need All
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(item.name, 50);
                              }}
                              className="flex-1 py-1.5 text-xs font-bold bg-violet-500/10 text-violet-500 rounded-lg hover:bg-violet-500/20"
                            >
                              Half
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(item.name, 100);
                                setEditingItem(null);
                              }}
                              className="flex-1 py-1.5 text-xs font-bold bg-accent/10 text-accent rounded-lg hover:bg-accent/20"
                            >
                              Have All
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-border/50 flex gap-2">
        {haveItems.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Clear all "have" items
              setCheckedItems(new Set());
              setHaveQuantities({});
            }}
            className="flex-1 border-2 font-bold border-muted-foreground/30 text-muted-foreground hover:bg-muted/20"
          >
            Clear Marked ({haveItems.length})
          </Button>
        )}
        <Button
          size="sm"
          className={`${haveItems.length > 0 ? "flex-1" : "w-full"} gradient-coral text-white font-bold`}
        >
          Add All to Cart
        </Button>
      </div>

      {/* Sync notice */}
      {inCartItems.length > 0 && (
        <div className="mt-3 p-2 bg-amber-400/10 rounded-lg text-xs text-center text-muted-foreground">
          <span className="text-sunny font-bold">{inCartItems.length} items</span> synced from your Marketplace cart
        </div>
      )}
    </Card>
  );
}
