// SEARCH RECIPES

export type SearchRecipesRequest = {
  query: string;
  dietary_filters?: string[];
  max_results?: number;
};

export type RecipeCard = {
  id: string;
  title: string;
  cuisine?: string;
  cook_time_min?: number;
  servings?: number;
  dietary_tags: string[];
  ingredients: { name: string; qty?: string }[];
  macros?: {
    calories: number;
    protein_g: number;
    iron_mg: number;
  };
  score: number;
};

export type SearchRecipesResponse = {
  recipes: RecipeCard[];
};

// GET NUTRITION

export type GetNutritionRequest =
  | { food_item: string }
  | { recipe_id: string };

export type NutritionResponse = {
  item_name: string;
  source: "USDA";
  fdcId: number;
  nutrients: {
    calories_kcal: number;
    protein_g: number;
    iron_mg: number;
  };
  confidence: "high" | "medium" | "low";
};

// GENERATE MEAL PLAN

export type GenerateMealPlanRequest = {
  preferences: {
    dietary_filters?: string[];
    dislikes?: string[];
    skill_level?: "beginner" | "intermediate" | "advanced";
    max_cook_time_min?: number;
  };
  num_days: number;
  budget: number;
  schedule?: { day: string; time: string }[];
};

export type MealPlanResponse = {
  plan_title: string;
  days: {
    day: string;
    meals: {
      recipe_id: string;
      title: string;
      cook_time_min?: number;
      ingredients: { name: string; qty?: string }[];
      macros: {
        calories: number;
        protein_g: number;
        iron_mg: number;
      };
      notes?: string;
    }[];
    totals: {
      calories: number;
      protein_g: number;
      iron_mg: number;
    };
  }[];
  grocery_list: { name: string; qty?: string }[];
  estimated_cost_usd: number;
  assumptions: string[];
};
