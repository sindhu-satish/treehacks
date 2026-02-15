// Chat types
export interface ChatRecipeFromApi {
  id: string;
  name: string;
  cook_time_min?: number | null;
  ingredients?: string[];
  dietary_tags?: string[];
  image_link?: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  /** Recipes from search_recipes tool (shown as cards in chat) */
  recipes?: ChatRecipeFromApi[];
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
  estimatedCost?: number;
  cheapestStore?: string;
  isSaved?: boolean;
  madeCount?: number;
  lastMade?: Date;
}

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  notes?: string;
  price?: number;
  cheapestStore?: string;
  storeOptions?: StorePrice[];
}

export interface StorePrice {
  storeId: string;
  storeName: string;
  price: number;
  inStock: boolean;
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
    /** Product name from store (e.g. "Chobani Greek Yogurt") */
    productName?: string | null;
    /** Product image URL */
    image?: string | null;
    /** Display price string (e.g. "$4.67") */
    linePriceDisplay?: string | null;
    /** Unit price (e.g. "22.0 ¢/oz") */
    unitPrice?: string | null;
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
  checked?: boolean;
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

// User profile
export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  preferences: UserPreferences;
  savedRecipes: string[];
  madeRecipes: RecipeJournalEntry[];
  createdAt: Date;
  updatedAt: Date;
}

// Recipe journal entry (when user makes a recipe)
export interface RecipeJournalEntry {
  id: string;
  recipeId: string;
  recipeName: string;
  madeAt: Date;
  rating: number; // 1-5
  photos: string[];
  notes: string;
  modifications: string;
  wouldMakeAgain: boolean;
}

// Short-form content (TikTok, Reels, etc.)
export interface ShortFormContent {
  id: string;
  platform: "tiktok" | "instagram" | "youtube";
  url: string;
  thumbnailUrl: string;
  title: string;
  creator: string;
  recipeId?: string; // linked recipe if we've extracted it
}

// Shopping cart types
export interface CartItem {
  id: string;
  ingredient: string;
  storeId: string;
  storeName: string;
  price: number;
  quantity: number;
  unit: string;
  recipeId?: string;
  recipeName?: string;
}

export interface ShoppingCart {
  items: CartItem[];
  totalCost: number;
  storeBreakdown: {
    storeId: string;
    storeName: string;
    items: CartItem[];
    subtotal: number;
  }[];
}
