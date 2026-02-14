"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { CartItem, Recipe, NutritionInfo } from "@/types";

interface MealLogEntry {
  id: string;
  date: Date;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  description: string;
  photoUrl?: string;
  isFromMealPlan: boolean;
  recipeId?: string;
  recipeName?: string;
  nutrition: NutritionInfo;
  feedback?: {
    rating: number;
    notes: string;
    wouldMakeAgain: boolean;
  };
}

interface SelectedMeal {
  dayIndex: number;
  mealType: string;
  recipeId: string;
  recipeName: string;
  servings: number;
}

interface GroceryListItem {
  id: string;
  ingredient: string;
  amount: string;
  unit: string;
  category: string;
  recipeIds: string[];
  recipeNames: string[];
  estimatedPrice: number;
  inCart: boolean;
  alreadyHave: boolean;
  selectedStoreId?: string;
  selectedStoreName?: string;
  selectedPrice?: number;
}

interface NutritionSummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  meals: MealLogEntry[];
  targetCalories: number;
  targetProtein: number;
}

interface MahmContextType {
  // Cart
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;

  // Grocery List (weekly)
  groceryList: GroceryListItem[];
  setGroceryList: (items: GroceryListItem[]) => void;
  toggleAlreadyHave: (itemId: string) => void;
  syncCartToGroceryList: () => void;

  // Pantry (items user already has)
  pantryItems: string[];
  addToPantry: (item: string) => void;
  removeFromPantry: (item: string) => void;

  // Selected Meals
  selectedMeals: SelectedMeal[];
  setSelectedMeals: (meals: SelectedMeal[]) => void;
  swapMeal: (dayIndex: number, mealType: string, newRecipe: Recipe) => void;
  regenerateMeal: (dayIndex: number, mealType: string) => void;
  removeMeal: (dayIndex: number, mealType: string) => void;

  // Meal Logging
  mealLogs: MealLogEntry[];
  logMeal: (entry: Omit<MealLogEntry, "id">) => void;
  updateMealFeedback: (logId: string, feedback: MealLogEntry["feedback"]) => void;

  // Nutrition Tracking
  nutritionSummary: NutritionSummary[];
  todayNutrition: NutritionSummary | null;
  weeklyNutrition: { avgCalories: number; avgProtein: number; avgCarbs: number; avgFat: number };

  // GCal Integration
  pendingFeedbackReminders: { mealLogId: string; scheduledTime: Date }[];
  scheduleFeedbackReminder: (mealLogId: string, time: Date) => void;
}

const MahmContext = createContext<MahmContextType | undefined>(undefined);

export function MahmProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [groceryList, setGroceryListState] = useState<GroceryListItem[]>([]);
  const [pantryItems, setPantryItems] = useState<string[]>([]);
  const [selectedMeals, setSelectedMealsState] = useState<SelectedMeal[]>([]);
  const [mealLogs, setMealLogs] = useState<MealLogEntry[]>([]);
  const [nutritionSummary, setNutritionSummary] = useState<NutritionSummary[]>([]);
  const [pendingFeedbackReminders, setPendingFeedbackReminders] = useState<{ mealLogId: string; scheduledTime: Date }[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("mahm_cart");
    const savedPantry = localStorage.getItem("mahm_pantry");
    const savedMealLogs = localStorage.getItem("mahm_meal_logs");
    const savedGroceryList = localStorage.getItem("mahm_grocery_list");

    if (savedCart) setCart(JSON.parse(savedCart));
    if (savedPantry) setPantryItems(JSON.parse(savedPantry));
    if (savedMealLogs) setMealLogs(JSON.parse(savedMealLogs));
    if (savedGroceryList) setGroceryListState(JSON.parse(savedGroceryList));
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem("mahm_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("mahm_pantry", JSON.stringify(pantryItems));
  }, [pantryItems]);

  useEffect(() => {
    localStorage.setItem("mahm_meal_logs", JSON.stringify(mealLogs));
  }, [mealLogs]);

  useEffect(() => {
    localStorage.setItem("mahm_grocery_list", JSON.stringify(groceryList));
  }, [groceryList]);

  // Calculate nutrition summary whenever meal logs change
  useEffect(() => {
    const summaryByDate: Record<string, NutritionSummary> = {};

    mealLogs.forEach(log => {
      const dateStr = new Date(log.date).toDateString();
      if (!summaryByDate[dateStr]) {
        summaryByDate[dateStr] = {
          date: dateStr,
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          totalFiber: 0,
          meals: [],
          targetCalories: 2000, // Default target
          targetProtein: 50,
        };
      }

      summaryByDate[dateStr].totalCalories += log.nutrition.calories;
      summaryByDate[dateStr].totalProtein += log.nutrition.protein;
      summaryByDate[dateStr].totalCarbs += log.nutrition.carbs;
      summaryByDate[dateStr].totalFat += log.nutrition.fat;
      summaryByDate[dateStr].totalFiber += log.nutrition.fiber;
      summaryByDate[dateStr].meals.push(log);
    });

    setNutritionSummary(Object.values(summaryByDate));
  }, [mealLogs]);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const todayNutrition = nutritionSummary.find(
    s => s.date === new Date().toDateString()
  ) || null;

  const weeklyNutrition = (() => {
    const lastWeek = nutritionSummary.filter(s => {
      const date = new Date(s.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    });

    if (lastWeek.length === 0) {
      return { avgCalories: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0 };
    }

    return {
      avgCalories: Math.round(lastWeek.reduce((sum, s) => sum + s.totalCalories, 0) / lastWeek.length),
      avgProtein: Math.round(lastWeek.reduce((sum, s) => sum + s.totalProtein, 0) / lastWeek.length),
      avgCarbs: Math.round(lastWeek.reduce((sum, s) => sum + s.totalCarbs, 0) / lastWeek.length),
      avgFat: Math.round(lastWeek.reduce((sum, s) => sum + s.totalFat, 0) / lastWeek.length),
    };
  })();

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i);
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const updateCartQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
    } else {
      setCart(prev => prev.map(item => item.id === itemId ? { ...item, quantity } : item));
    }
  };

  const clearCart = () => setCart([]);

  const setGroceryList = (items: GroceryListItem[]) => {
    setGroceryListState(items);
  };

  const toggleAlreadyHave = (itemId: string) => {
    setGroceryListState(prev => prev.map(item =>
      item.id === itemId ? { ...item, alreadyHave: !item.alreadyHave } : item
    ));
  };

  const syncCartToGroceryList = () => {
    // Mark grocery list items as "in cart" based on cart contents
    setGroceryListState(prev => prev.map(item => {
      const inCart = cart.some(cartItem =>
        cartItem.ingredient.toLowerCase() === item.ingredient.toLowerCase()
      );
      const cartItem = cart.find(ci =>
        ci.ingredient.toLowerCase() === item.ingredient.toLowerCase()
      );

      return {
        ...item,
        inCart,
        selectedStoreId: cartItem?.storeId,
        selectedStoreName: cartItem?.storeName,
        selectedPrice: cartItem?.price,
      };
    }));
  };

  const addToPantry = (item: string) => {
    setPantryItems(prev => [...new Set([...prev, item])]);
  };

  const removeFromPantry = (item: string) => {
    setPantryItems(prev => prev.filter(i => i !== item));
  };

  const setSelectedMeals = (meals: SelectedMeal[]) => {
    setSelectedMealsState(meals);
  };

  const swapMeal = (dayIndex: number, mealType: string, newRecipe: Recipe) => {
    setSelectedMealsState(prev => prev.map(meal =>
      meal.dayIndex === dayIndex && meal.mealType === mealType
        ? { ...meal, recipeId: newRecipe.id, recipeName: newRecipe.name }
        : meal
    ));
  };

  const regenerateMeal = (dayIndex: number, mealType: string) => {
    // In real app, this would call AI to generate a new meal
    console.log(`Regenerating meal for day ${dayIndex}, ${mealType}`);
  };

  const removeMeal = (dayIndex: number, mealType: string) => {
    setSelectedMealsState(prev => prev.filter(meal =>
      !(meal.dayIndex === dayIndex && meal.mealType === mealType)
    ));
  };

  const logMeal = (entry: Omit<MealLogEntry, "id">) => {
    const newEntry: MealLogEntry = {
      ...entry,
      id: `meal-${Date.now()}`,
    };
    setMealLogs(prev => [...prev, newEntry]);
  };

  const updateMealFeedback = (logId: string, feedback: MealLogEntry["feedback"]) => {
    setMealLogs(prev => prev.map(log =>
      log.id === logId ? { ...log, feedback } : log
    ));
  };

  const scheduleFeedbackReminder = (mealLogId: string, time: Date) => {
    setPendingFeedbackReminders(prev => [...prev, { mealLogId, scheduledTime: time }]);
    // In real app, this would integrate with Google Calendar API
    console.log(`Scheduled feedback reminder for ${mealLogId} at ${time}`);
  };

  return (
    <MahmContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      cartTotal,
      groceryList,
      setGroceryList,
      toggleAlreadyHave,
      syncCartToGroceryList,
      pantryItems,
      addToPantry,
      removeFromPantry,
      selectedMeals,
      setSelectedMeals,
      swapMeal,
      regenerateMeal,
      removeMeal,
      mealLogs,
      logMeal,
      updateMealFeedback,
      nutritionSummary,
      todayNutrition,
      weeklyNutrition,
      pendingFeedbackReminders,
      scheduleFeedbackReminder,
    }}>
      {children}
    </MahmContext.Provider>
  );
}

export function useMahm() {
  const context = useContext(MahmContext);
  if (context === undefined) {
    throw new Error("useMahm must be used within a MahmProvider");
  }
  return context;
}
