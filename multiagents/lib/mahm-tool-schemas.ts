/**
 * Tool definitions for Claude Messages API (JSON Schema).
 */

import type Anthropic from "@anthropic-ai/sdk";

export const MAHM_TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "search_recipes",
    description:
      "Search for recipes by query and optional dietary filters. Returns ranked recipes with name, ingredients, cook time, and dietary tags. Use when the user wants meal ideas, dinner recommendations, or snacks. The results are shown as cards below your message—do not list recipe names in your reply; write only a brief intro.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query, e.g. 'vegetarian dinner', 'lentil soup'",
        },
        dietary_filters: {
          type: "array",
          items: { type: "string" },
          description: "e.g. ['vegetarian', 'gluten-free', 'dairy-free']",
        },
        max_results: {
          type: "number",
          description: "Max number of recipes to return (default 5)",
          default: 5,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_nutrition",
    description:
      "Get full macro/micronutrient breakdown for a food item or recipe (USDA-style). ALWAYS use before stating any calories or macros. Use when user asks 'how many calories in...' or when you need to cite nutrition for a recommendation.",
    input_schema: {
      type: "object",
      properties: {
        food_item: {
          type: "string",
          description: "Name of food or dish, e.g. 'lentil dal', 'chickpeas'",
        },
        recipe_id: {
          type: "string",
          description: "Recipe ID if looking up a specific recipe",
        },
      },
    },
  },
  {
    name: "find_stores",
    description:
      "Find local stores that carry the given ingredients, with prices and distance. Use when user asks where to buy ingredients or when you want to offer 'I can find these near you' after recommending a recipe.",
    input_schema: {
      type: "object",
      properties: {
        ingredient_list: {
          type: "array",
          items: { type: "string" },
          description: "List of ingredients to find",
        },
        zip_code: {
          type: "string",
          description: "User's zip code for local search",
        },
      },
      required: ["ingredient_list", "zip_code"],
    },
  },
  {
    name: "generate_meal_plan",
    description:
      "Generate a multi-day meal plan (e.g. 7 days) with preferences, budget, and schedule. Returns daily meals, grocery list, total cost, and daily nutrition. Use when user asks to plan their week or for a weekly plan.",
    input_schema: {
      type: "object",
      properties: {
        preferences: {
          type: "string",
          description: "Dietary prefs, goals, constraints (e.g. 'vegetarian, $80/week')",
        },
        num_days: {
          type: "number",
          description: "Number of days to plan (default 7)",
          default: 7,
        },
        budget: {
          type: "string",
          description: "e.g. '$80/week'",
        },
        schedule: {
          type: "string",
          description: "e.g. 'no-cook lunch on weekdays'",
        },
      },
      required: ["preferences"],
    },
  },
];
