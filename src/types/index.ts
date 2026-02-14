// Chat types
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: "search_recipes" | "get_nutrition" | "find_stores" | "generate_meal_plan";
  status: "pending" | "complete" | "error";
  result?: unknown;
}

// Recipe types
export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: Ingredient[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  nutrition: NutritionInfo;
  dietaryTags: string[];
  cuisine: string;
  difficulty: "easy" | "medium" | "hard";
  imageUrl?: string;
}

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  notes?: string;
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar?: number;
  sodium?: number;
}

// Marketplace types
export interface Store {
  id: string;
  name: string;
  address: string;
  distance: number;
  distanceUnit: "mi" | "km";
  logoUrl?: string;
}

export interface StoreItem {
  ingredientName: string;
  price: number;
  unit: string;
  inStock: boolean;
  storeName: string;
  storeId: string;
}

export interface GroceryComparison {
  ingredient: string;
  stores: {
    store: Store;
    price: number;
    inStock: boolean;
    isCheapest: boolean;
  }[];
}

// Calendar types
export interface MealPlan {
  id: string;
  startDate: Date;
  endDate: Date;
  days: MealDay[];
  totalCost: number;
  groceryList: GroceryItem[];
}

export interface MealDay {
  date: Date;
  meals: {
    breakfast?: PlannedMeal;
    lunch?: PlannedMeal;
    dinner?: PlannedMeal;
    snacks?: PlannedMeal[];
  };
  dailyNutrition: NutritionInfo;
}

export interface PlannedMeal {
  recipe: Recipe;
  servings: number;
  notes?: string;
}

export interface GroceryItem {
  ingredient: Ingredient;
  recipes: string[];
  estimatedCost?: number;
  store?: string;
}

// User preferences
export interface UserPreferences {
  dietaryRestrictions: string[];
  allergies: string[];
  dislikedFoods: string[];
  budget: number;
  budgetPeriod: "weekly" | "monthly";
  cookingSkill: "beginner" | "intermediate" | "advanced";
  availableTime: number; // minutes per meal
  healthGoals: string[];
  householdSize: number;
}
