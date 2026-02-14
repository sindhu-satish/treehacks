import { Recipe, Store, MealPlan, GroceryComparison, ChatMessage } from "@/types";

export const dummyRecipes: Recipe[] = [
  {
    id: "1",
    name: "Creamy Lentil Dal",
    description: "A comforting, protein-rich Indian classic that's perfect for beginners. Warm spices and creamy coconut make this dish irresistible.",
    ingredients: [
      { name: "Red lentils", amount: 1, unit: "cup" },
      { name: "Coconut milk", amount: 1, unit: "can" },
      { name: "Onion", amount: 1, unit: "medium" },
      { name: "Garlic", amount: 3, unit: "cloves" },
      { name: "Ginger", amount: 1, unit: "inch" },
      { name: "Turmeric", amount: 1, unit: "tsp" },
      { name: "Cumin", amount: 1, unit: "tsp" },
      { name: "Garam masala", amount: 1, unit: "tsp" },
      { name: "Vegetable broth", amount: 2, unit: "cups" },
      { name: "Spinach", amount: 2, unit: "cups" },
    ],
    instructions: [
      "Rinse lentils until water runs clear",
      "Sauté onion, garlic, and ginger until fragrant",
      "Add spices and toast for 30 seconds",
      "Add lentils, broth, and coconut milk",
      "Simmer for 20 minutes until lentils are tender",
      "Stir in spinach and serve over rice",
    ],
    prepTime: 10,
    cookTime: 25,
    servings: 4,
    nutrition: {
      calories: 320,
      protein: 14,
      carbs: 42,
      fat: 12,
      fiber: 8,
    },
    dietaryTags: ["vegetarian", "vegan", "gluten-free", "dairy-free"],
    cuisine: "Indian",
    difficulty: "easy",
  },
  {
    id: "2",
    name: "Chickpea & Veggie Curry",
    description: "A hearty, budget-friendly curry loaded with vegetables and plant protein. Ready in under 30 minutes!",
    ingredients: [
      { name: "Chickpeas", amount: 2, unit: "cans" },
      { name: "Cauliflower", amount: 1, unit: "head" },
      { name: "Bell pepper", amount: 2, unit: "medium" },
      { name: "Coconut cream", amount: 1, unit: "can" },
      { name: "Curry powder", amount: 2, unit: "tbsp" },
      { name: "Tomato paste", amount: 2, unit: "tbsp" },
      { name: "Onion", amount: 1, unit: "large" },
      { name: "Garlic", amount: 4, unit: "cloves" },
    ],
    instructions: [
      "Sauté onion and garlic until golden",
      "Add curry powder and tomato paste, stir well",
      "Add cauliflower florets and bell peppers",
      "Pour in coconut cream and chickpeas",
      "Simmer for 20 minutes until vegetables are tender",
      "Season to taste and serve with naan or rice",
    ],
    prepTime: 15,
    cookTime: 25,
    servings: 6,
    nutrition: {
      calories: 285,
      protein: 11,
      carbs: 38,
      fat: 10,
      fiber: 10,
    },
    dietaryTags: ["vegetarian", "vegan", "gluten-free"],
    cuisine: "Indian",
    difficulty: "easy",
  },
  {
    id: "3",
    name: "Black Bean Tacos",
    description: "Quick, customizable, and packed with flavor. Perfect for busy weeknights when you want something satisfying.",
    ingredients: [
      { name: "Black beans", amount: 2, unit: "cans" },
      { name: "Corn tortillas", amount: 12, unit: "small" },
      { name: "Avocado", amount: 2, unit: "medium" },
      { name: "Red cabbage", amount: 2, unit: "cups" },
      { name: "Lime", amount: 2, unit: "whole" },
      { name: "Cilantro", amount: 1, unit: "bunch" },
      { name: "Cumin", amount: 1, unit: "tsp" },
      { name: "Chipotle powder", amount: 0.5, unit: "tsp" },
      { name: "Salsa verde", amount: 1, unit: "cup" },
    ],
    instructions: [
      "Season and warm black beans with cumin and chipotle",
      "Warm tortillas in a dry pan",
      "Shred cabbage and chop cilantro",
      "Slice avocado and cut limes into wedges",
      "Assemble tacos with beans, cabbage, avocado, cilantro",
      "Top with salsa verde and a squeeze of lime",
    ],
    prepTime: 15,
    cookTime: 10,
    servings: 4,
    nutrition: {
      calories: 340,
      protein: 12,
      carbs: 48,
      fat: 14,
      fiber: 14,
    },
    dietaryTags: ["vegetarian", "vegan", "dairy-free"],
    cuisine: "Mexican",
    difficulty: "easy",
  },
];

export const dummyStores: Store[] = [
  {
    id: "tj",
    name: "Trader Joe's",
    address: "855 El Camino Real, Palo Alto, CA",
    distance: 0.8,
    distanceUnit: "mi",
  },
  {
    id: "wf",
    name: "Whole Foods",
    address: "774 Emerson St, Palo Alto, CA",
    distance: 1.2,
    distanceUnit: "mi",
  },
  {
    id: "safeway",
    name: "Safeway",
    address: "325 S California Ave, Palo Alto, CA",
    distance: 1.5,
    distanceUnit: "mi",
  },
];

export const dummyGroceryComparison: GroceryComparison[] = [
  {
    ingredient: "Red lentils (1 lb)",
    stores: [
      { store: dummyStores[0], price: 2.99, inStock: true, isCheapest: true },
      { store: dummyStores[1], price: 4.49, inStock: true, isCheapest: false },
      { store: dummyStores[2], price: 3.79, inStock: true, isCheapest: false },
    ],
  },
  {
    ingredient: "Coconut milk (13.5 oz)",
    stores: [
      { store: dummyStores[0], price: 1.99, inStock: true, isCheapest: true },
      { store: dummyStores[1], price: 2.99, inStock: true, isCheapest: false },
      { store: dummyStores[2], price: 2.49, inStock: false, isCheapest: false },
    ],
  },
  {
    ingredient: "Fresh spinach (5 oz)",
    stores: [
      { store: dummyStores[0], price: 2.49, inStock: true, isCheapest: false },
      { store: dummyStores[1], price: 3.99, inStock: true, isCheapest: false },
      { store: dummyStores[2], price: 2.29, inStock: true, isCheapest: true },
    ],
  },
  {
    ingredient: "Chickpeas (15 oz can)",
    stores: [
      { store: dummyStores[0], price: 0.99, inStock: true, isCheapest: true },
      { store: dummyStores[1], price: 1.69, inStock: true, isCheapest: false },
      { store: dummyStores[2], price: 1.29, inStock: true, isCheapest: false },
    ],
  },
  {
    ingredient: "Avocados (each)",
    stores: [
      { store: dummyStores[0], price: 0.79, inStock: true, isCheapest: true },
      { store: dummyStores[1], price: 1.50, inStock: true, isCheapest: false },
      { store: dummyStores[2], price: 1.00, inStock: true, isCheapest: false },
    ],
  },
];

export const dummyMealPlan: MealPlan = {
  id: "mp1",
  startDate: new Date(),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  totalCost: 73,
  groceryList: [],
  days: [
    {
      date: new Date(),
      meals: {
        breakfast: { recipe: { ...dummyRecipes[0], name: "Overnight Oats with Berries", nutrition: { calories: 320, protein: 12, carbs: 45, fat: 8, fiber: 6 } } as Recipe, servings: 1 },
        lunch: { recipe: { ...dummyRecipes[2], name: "Mediterranean Quinoa Bowl", nutrition: { calories: 420, protein: 15, carbs: 52, fat: 16, fiber: 8 } } as Recipe, servings: 1 },
        dinner: { recipe: dummyRecipes[0], servings: 2 },
      },
      dailyNutrition: { calories: 1380, protein: 55, carbs: 181, fat: 48, fiber: 30 },
    },
    {
      date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      meals: {
        breakfast: { recipe: { ...dummyRecipes[0], name: "Banana Peanut Butter Smoothie", nutrition: { calories: 380, protein: 14, carbs: 48, fat: 16, fiber: 5 } } as Recipe, servings: 1 },
        lunch: { recipe: { ...dummyRecipes[0], name: "Leftover Lentil Dal", nutrition: { calories: 320, protein: 14, carbs: 42, fat: 12, fiber: 8 } } as Recipe, servings: 1 },
        dinner: { recipe: dummyRecipes[1], servings: 2 },
      },
      dailyNutrition: { calories: 1270, protein: 50, carbs: 166, fat: 50, fiber: 31 },
    },
    {
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      meals: {
        breakfast: { recipe: { ...dummyRecipes[0], name: "Avocado Toast with Seeds", nutrition: { calories: 340, protein: 10, carbs: 32, fat: 20, fiber: 8 } } as Recipe, servings: 1 },
        lunch: { recipe: { ...dummyRecipes[1], name: "Leftover Chickpea Curry", nutrition: { calories: 285, protein: 11, carbs: 38, fat: 10, fiber: 10 } } as Recipe, servings: 1 },
        dinner: { recipe: dummyRecipes[2], servings: 2 },
      },
      dailyNutrition: { calories: 1305, protein: 45, carbs: 166, fat: 58, fiber: 46 },
    },
    {
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      meals: {
        breakfast: { recipe: { ...dummyRecipes[0], name: "Greek Yogurt Parfait", nutrition: { calories: 290, protein: 18, carbs: 38, fat: 8, fiber: 4 } } as Recipe, servings: 1 },
        lunch: { recipe: { ...dummyRecipes[2], name: "Veggie Wrap", nutrition: { calories: 380, protein: 12, carbs: 48, fat: 14, fiber: 8 } } as Recipe, servings: 1 },
        dinner: { recipe: { ...dummyRecipes[0], name: "Mushroom Risotto", nutrition: { calories: 450, protein: 12, carbs: 62, fat: 16, fiber: 4 } } as Recipe, servings: 2 },
      },
      dailyNutrition: { calories: 1570, protein: 54, carbs: 186, fat: 52, fiber: 24 },
    },
    {
      date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      meals: {
        breakfast: { recipe: { ...dummyRecipes[0], name: "Chia Pudding", nutrition: { calories: 280, protein: 8, carbs: 32, fat: 14, fiber: 10 } } as Recipe, servings: 1 },
        lunch: { recipe: { ...dummyRecipes[0], name: "Leftover Risotto", nutrition: { calories: 450, protein: 12, carbs: 62, fat: 16, fiber: 4 } } as Recipe, servings: 1 },
        dinner: { recipe: { ...dummyRecipes[1], name: "Stir-Fried Tofu & Vegetables", nutrition: { calories: 380, protein: 22, carbs: 28, fat: 20, fiber: 6 } } as Recipe, servings: 2 },
      },
      dailyNutrition: { calories: 1490, protein: 54, carbs: 154, fat: 64, fiber: 26 },
    },
    {
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      meals: {
        breakfast: { recipe: { ...dummyRecipes[0], name: "Veggie Scramble", nutrition: { calories: 320, protein: 16, carbs: 12, fat: 24, fiber: 4 } } as Recipe, servings: 1 },
        lunch: { recipe: { ...dummyRecipes[2], name: "Buddha Bowl", nutrition: { calories: 420, protein: 14, carbs: 58, fat: 16, fiber: 12 } } as Recipe, servings: 1 },
        dinner: { recipe: dummyRecipes[0], servings: 2 },
      },
      dailyNutrition: { calories: 1380, protein: 58, carbs: 154, fat: 64, fiber: 32 },
    },
    {
      date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      meals: {
        breakfast: { recipe: { ...dummyRecipes[0], name: "Pancakes with Fresh Fruit", nutrition: { calories: 420, protein: 10, carbs: 68, fat: 12, fiber: 4 } } as Recipe, servings: 1 },
        lunch: { recipe: { ...dummyRecipes[0], name: "Leftover Dal with Rice", nutrition: { calories: 380, protein: 16, carbs: 58, fat: 10, fiber: 10 } } as Recipe, servings: 1 },
        dinner: { recipe: dummyRecipes[1], servings: 2 },
      },
      dailyNutrition: { calories: 1370, protein: 48, carbs: 202, fat: 42, fiber: 34 },
    },
  ],
};

export const dummyChatHistory: ChatMessage[] = [
  {
    id: "1",
    role: "assistant",
    content: "Hey there! I'm Mahm, your AI nutritionist and meal planning buddy. I'm here to help you eat well without the stress. Tell me a bit about yourself - any dietary restrictions, allergies, or foods you absolutely can't stand? And what's your weekly grocery budget looking like?",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
  },
  {
    id: "2",
    role: "user",
    content: "I'm vegetarian, lactose intolerant, trying to lose weight, $80/week budget",
    timestamp: new Date(Date.now() - 4 * 60 * 1000),
  },
  {
    id: "3",
    role: "assistant",
    content: "Got it! Vegetarian + lactose-free + weight loss goals on $80/week - totally doable. A few more quick questions to make sure I nail this:\n\n1. **Cooking skill level?** (Total beginner, comfortable, or chef mode?)\n2. **Any foods you hate?** (No judgment - we all have our nemeses)\n3. **How much time do you have for cooking on weeknights?** (15 min? 30? An hour?)",
    timestamp: new Date(Date.now() - 3 * 60 * 1000),
  },
  {
    id: "4",
    role: "user",
    content: "Beginner. Hate tofu. Usually have about 30 mins on weeknights",
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
  },
  {
    id: "5",
    role: "assistant",
    content: "Perfect! No tofu, beginner-friendly, 30-min max. I've got you covered.\n\nHere are 3 dinner ideas that fit your needs - all high-protein (since you mentioned weight loss), dairy-free, and totally beginner-proof:",
    timestamp: new Date(Date.now() - 1 * 60 * 1000),
    toolCalls: [
      { id: "tc1", name: "search_recipes", status: "complete" },
      { id: "tc2", name: "get_nutrition", status: "complete" },
    ],
  },
];
