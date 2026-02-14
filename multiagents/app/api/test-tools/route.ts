/**
 * GET /api/test-tools — Run all four Mahm tools with sample inputs.
 * Use this to verify tool implementations without calling the agent.
 * No ANTHROPIC_API_KEY needed.
 */

import { NextResponse } from "next/server";
import { runTool } from "@/lib/mahm-tools";

export async function GET() {
  const results: Record<string, { input: unknown; output: string }> = {};

  try {
    results.search_recipes = {
      input: { query: "vegetarian dinner", dietary_filters: ["vegetarian"], max_results: 3 },
      output: await runTool("search_recipes", {
        query: "vegetarian dinner",
        dietary_filters: ["vegetarian"],
        max_results: 3,
      }),
    };
  } catch (e) {
    results.search_recipes = { input: {}, output: String(e) };
  }

  try {
    results.get_nutrition = {
      input: { food_item: "lentil dal" },
      output: await runTool("get_nutrition", { food_item: "lentil dal" }),
    };
  } catch (e) {
    results.get_nutrition = { input: {}, output: String(e) };
  }

  try {
    results.find_stores = {
      input: { ingredient_list: ["red lentils", "coconut milk"], zip_code: "94305" },
      output: await runTool("find_stores", {
        ingredient_list: ["red lentils", "coconut milk"],
        zip_code: "94305",
      }),
    };
  } catch (e) {
    results.find_stores = { input: {}, output: String(e) };
  }

  try {
    results.generate_meal_plan = {
      input: { preferences: "vegetarian, $80/week", num_days: 7, budget: "$80/week" },
      output: await runTool("generate_meal_plan", {
        preferences: "vegetarian, $80/week",
        num_days: 7,
        budget: "$80/week",
      }),
    };
  } catch (e) {
    results.generate_meal_plan = { input: {}, output: String(e) };
  }

  return NextResponse.json(results);
}
