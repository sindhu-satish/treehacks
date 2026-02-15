"""
Nutrition estimation and meal generation endpoints using OpenAI.
POST /api/nutrition/estimate - Estimate nutrition for a meal
POST /api/meals/generate - Generate personalized meal plan
"""

import os
import json
from flask import Blueprint, request, jsonify

nutrition_bp = Blueprint("nutrition", __name__)

# Initialize OpenAI client lazily
_openai_client = None

def get_openai_client():
    global _openai_client
    if _openai_client is None:
        from openai import OpenAI
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not set")
        _openai_client = OpenAI(api_key=api_key)
    return _openai_client


@nutrition_bp.route("/nutrition/estimate", methods=["POST"])
def estimate_nutrition():
    """
    Estimate nutrition info for a meal using OpenAI.
    Body: { meal_name: string, ingredients?: string[], serving_size?: string }
    Returns: { calories, protein, carbs, fat, fiber }
    """
    data = request.get_json() or {}
    meal_name = data.get("meal_name", "")
    ingredients = data.get("ingredients", [])
    serving_size = data.get("serving_size", "1 serving")

    if not meal_name:
        return jsonify({"error": "meal_name is required"}), 400

    try:
        client = get_openai_client()

        # Build the prompt
        ingredients_text = ""
        if ingredients and len(ingredients) > 0:
            ingredients_text = f"\nIngredients: {', '.join(ingredients)}"

        prompt = f"""Estimate the nutritional information for the following meal.
Meal: {meal_name}{ingredients_text}
Serving size: {serving_size}

Respond with ONLY a JSON object (no markdown, no explanation) in this exact format:
{{"calories": <number>, "protein": <number in grams>, "carbs": <number in grams>, "fat": <number in grams>, "fiber": <number in grams>}}

Be realistic and accurate based on typical nutritional values for this type of meal."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a nutrition expert. Provide accurate nutritional estimates in JSON format only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=150
        )

        content = response.choices[0].message.content.strip()

        # Parse JSON from response (handle potential markdown code blocks)
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()

        nutrition = json.loads(content)

        return jsonify({
            "calories": int(nutrition.get("calories", 400)),
            "protein": int(nutrition.get("protein", 20)),
            "carbs": int(nutrition.get("carbs", 45)),
            "fat": int(nutrition.get("fat", 15)),
            "fiber": int(nutrition.get("fiber", 5)),
        })

    except Exception as e:
        print(f"Nutrition estimation error: {e}")
        # Return sensible defaults on error
        return jsonify({
            "calories": 400,
            "protein": 20,
            "carbs": 45,
            "fat": 15,
            "fiber": 5,
            "error": str(e)
        }), 200  # Return 200 with defaults so frontend doesn't fail


@nutrition_bp.route("/meals/generate", methods=["POST"])
def generate_meals():
    """
    Generate personalized meal suggestions using OpenAI.
    Body: { preferences: { dietary?, allergies?, dislikes?, goals?, budget?, cookingTime?, householdSize?, skillLevel? } }
    Returns: { meals: MealSuggestion[] }
    """
    data = request.get_json() or {}
    preferences = data.get("preferences", {})

    dietary = preferences.get("dietary", [])
    allergies = preferences.get("allergies", [])
    dislikes = preferences.get("dislikes", "")
    goals = preferences.get("goals", [])
    budget = preferences.get("budget", 100)
    cooking_time = preferences.get("cookingTime", 30)
    household_size = preferences.get("householdSize", 2)
    skill_level = preferences.get("skillLevel", "intermediate")

    try:
        client = get_openai_client()

        # Build preferences description
        pref_parts = []
        if dietary:
            pref_parts.append(f"Dietary preferences: {', '.join(dietary)}")
        if allergies:
            pref_parts.append(f"Allergies/restrictions: {', '.join(allergies)}")
        if dislikes:
            pref_parts.append(f"Dislikes: {dislikes}")
        if goals:
            pref_parts.append(f"Health goals: {', '.join(goals)}")
        pref_parts.append(f"Weekly budget: ${budget}")
        pref_parts.append(f"Max cooking time: {cooking_time} minutes")
        pref_parts.append(f"Household size: {household_size}")
        pref_parts.append(f"Cooking skill: {skill_level}")

        preferences_text = "\n".join(pref_parts)

        prompt = f"""Generate a personalized weekly meal plan with 7 meals (2 breakfasts, 2 lunches, 3 dinners) based on these preferences:

{preferences_text}

Respond with ONLY a JSON object (no markdown, no explanation) in this exact format:
{{
  "meals": [
    {{
      "id": "meal-1",
      "name": "Meal Name",
      "description": "Brief appetizing description",
      "mealType": "breakfast" | "lunch" | "dinner",
      "prepTime": <minutes>,
      "cookTime": <minutes>,
      "servings": <number>,
      "nutrition": {{"calories": <num>, "protein": <g>, "carbs": <g>, "fat": <g>, "fiber": <g>}},
      "ingredients": ["ingredient 1", "ingredient 2"],
      "instructions": ["Step 1", "Step 2"],
      "dietaryTags": ["vegetarian", "gluten-free", etc]
    }}
  ]
}}

Make meals practical, delicious, and aligned with the user's preferences and goals."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a professional meal planner and nutritionist. Create practical, delicious meal plans in JSON format only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=3000
        )

        content = response.choices[0].message.content.strip()

        # Parse JSON from response (handle potential markdown code blocks)
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()

        result = json.loads(content)
        meals = result.get("meals", [])

        # Ensure all meals have required fields
        for i, meal in enumerate(meals):
            meal["id"] = meal.get("id", f"generated-{i+1}")
            meal["name"] = meal.get("name", f"Meal {i+1}")
            meal["description"] = meal.get("description", "")
            meal["mealType"] = meal.get("mealType", "dinner")
            meal["prepTime"] = int(meal.get("prepTime", 15))
            meal["cookTime"] = int(meal.get("cookTime", 20))
            meal["servings"] = int(meal.get("servings", household_size))
            meal["nutrition"] = meal.get("nutrition", {"calories": 400, "protein": 20, "carbs": 45, "fat": 15, "fiber": 5})
            meal["ingredients"] = meal.get("ingredients", [])
            meal["instructions"] = meal.get("instructions", [])
            meal["dietaryTags"] = meal.get("dietaryTags", [])

        return jsonify({"meals": meals})

    except Exception as e:
        print(f"Meal generation error: {e}")
        # Return default meals on error
        return jsonify({
            "meals": get_default_meals(),
            "error": str(e)
        }), 200


@nutrition_bp.route("/recipes/extract", methods=["POST"])
def extract_recipe():
    """
    Generate a recipe from a dish description using OpenAI.
    Body: { dish_name: string, restaurant_name?: string, notes?: string }
    Returns: { recipe: { name, description, prepTime, cookTime, servings, calories, ingredients, instructions } }
    """
    data = request.get_json() or {}
    dish_name = data.get("dish_name", "")
    restaurant_name = data.get("restaurant_name", "")
    notes = data.get("notes", "")

    if not dish_name:
        return jsonify({"error": "dish_name is required"}), 400

    try:
        client = get_openai_client()

        context_parts = []
        if restaurant_name:
            context_parts.append(f"This dish is from {restaurant_name}.")
        if notes:
            context_parts.append(f"Additional notes: {notes}")
        context = " ".join(context_parts)

        prompt = f"""Create a detailed homemade recipe for: {dish_name}
{context}

The recipe should be a home-cook friendly version that recreates this dish.

Respond with ONLY a JSON object (no markdown, no explanation) in this exact format:
{{
  "name": "Recipe Name",
  "description": "Brief appetizing description of the dish",
  "prepTime": <minutes as number>,
  "cookTime": <minutes as number>,
  "servings": <number>,
  "calories": <estimated calories per serving as number>,
  "ingredients": ["ingredient 1 with amount", "ingredient 2 with amount", ...],
  "instructions": ["Step 1 detailed instruction", "Step 2 detailed instruction", ...]
}}

Make the recipe practical, delicious, and achievable for a home cook."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert chef who specializes in recreating restaurant dishes for home cooks. Provide detailed, practical recipes in JSON format only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1500
        )

        content = response.choices[0].message.content.strip()

        # Parse JSON from response
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()

        recipe = json.loads(content)

        # Ensure all fields exist
        return jsonify({
            "recipe": {
                "name": recipe.get("name", dish_name),
                "description": recipe.get("description", f"Homemade version of {dish_name}"),
                "prepTime": int(recipe.get("prepTime", 15)),
                "cookTime": int(recipe.get("cookTime", 25)),
                "servings": int(recipe.get("servings", 4)),
                "calories": int(recipe.get("calories", 400)),
                "ingredients": recipe.get("ingredients", []),
                "instructions": recipe.get("instructions", []),
            }
        })

    except Exception as e:
        print(f"Recipe extraction error: {e}")
        # Return a basic recipe on error
        return jsonify({
            "recipe": {
                "name": dish_name or "Mystery Dish",
                "description": f"A delicious homemade version of {dish_name}",
                "prepTime": 15,
                "cookTime": 25,
                "servings": 4,
                "calories": 400,
                "ingredients": [
                    "2 cups main ingredient",
                    "1 tbsp olive oil",
                    "3 cloves garlic, minced",
                    "1 onion, diced",
                    "Salt and pepper to taste",
                    "Fresh herbs for garnish"
                ],
                "instructions": [
                    "Prep all ingredients by washing and chopping as needed.",
                    "Heat olive oil in a large pan over medium-high heat.",
                    "Sauté garlic and onion until fragrant.",
                    "Add main ingredients and cook until done.",
                    "Season to taste and serve."
                ]
            },
            "error": str(e)
        }), 200


def get_default_meals():
    """Fallback default meals if OpenAI fails."""
    return [
        {
            "id": "default-1",
            "name": "Overnight Oats with Berries",
            "description": "Creamy overnight oats topped with fresh berries and honey",
            "mealType": "breakfast",
            "prepTime": 5,
            "cookTime": 0,
            "servings": 1,
            "nutrition": {"calories": 320, "protein": 12, "carbs": 52, "fat": 8, "fiber": 6},
            "ingredients": ["1/2 cup oats", "1/2 cup milk", "1/4 cup Greek yogurt", "1/2 cup mixed berries", "1 tbsp honey"],
            "instructions": ["Mix oats, milk, and yogurt in a jar", "Refrigerate overnight", "Top with berries and honey"],
            "dietaryTags": ["vegetarian"],
        },
        {
            "id": "default-2",
            "name": "Mediterranean Quinoa Bowl",
            "description": "Fresh quinoa bowl with cucumber, tomatoes, feta, and lemon dressing",
            "mealType": "lunch",
            "prepTime": 15,
            "cookTime": 15,
            "servings": 2,
            "nutrition": {"calories": 420, "protein": 14, "carbs": 48, "fat": 18, "fiber": 8},
            "ingredients": ["1 cup quinoa", "1 cucumber diced", "1 cup cherry tomatoes", "1/2 cup feta cheese", "2 tbsp olive oil", "Juice of 1 lemon"],
            "instructions": ["Cook quinoa and let cool", "Dice vegetables", "Mix all ingredients", "Dress with olive oil and lemon"],
            "dietaryTags": ["vegetarian", "gluten-free"],
        },
        {
            "id": "default-3",
            "name": "Lemon Herb Chicken",
            "description": "Juicy chicken breast with lemon, garlic, and fresh herbs",
            "mealType": "dinner",
            "prepTime": 10,
            "cookTime": 25,
            "servings": 4,
            "nutrition": {"calories": 380, "protein": 42, "carbs": 8, "fat": 18, "fiber": 2},
            "ingredients": ["4 chicken breasts", "2 lemons", "4 cloves garlic", "Fresh rosemary", "Fresh thyme", "2 tbsp olive oil"],
            "instructions": ["Marinate chicken with lemon, garlic, and herbs", "Preheat oven to 400F", "Bake for 25 minutes until cooked through"],
            "dietaryTags": ["gluten-free", "dairy-free", "high-protein"],
        },
        {
            "id": "default-4",
            "name": "Vegetable Stir Fry",
            "description": "Colorful vegetable stir fry with tofu and ginger-soy sauce",
            "mealType": "dinner",
            "prepTime": 15,
            "cookTime": 10,
            "servings": 3,
            "nutrition": {"calories": 290, "protein": 16, "carbs": 28, "fat": 14, "fiber": 6},
            "ingredients": ["1 block firm tofu", "2 cups mixed vegetables", "2 tbsp soy sauce", "1 tbsp sesame oil", "1 inch ginger minced"],
            "instructions": ["Press and cube tofu", "Stir fry vegetables", "Add tofu and sauce", "Serve over rice"],
            "dietaryTags": ["vegetarian", "vegan", "dairy-free"],
        },
        {
            "id": "default-5",
            "name": "Greek Yogurt Parfait",
            "description": "Layered Greek yogurt with granola and fresh fruit",
            "mealType": "breakfast",
            "prepTime": 5,
            "cookTime": 0,
            "servings": 1,
            "nutrition": {"calories": 280, "protein": 18, "carbs": 38, "fat": 6, "fiber": 4},
            "ingredients": ["1 cup Greek yogurt", "1/4 cup granola", "1/2 cup mixed berries", "1 tbsp honey"],
            "instructions": ["Layer yogurt, granola, and berries in a glass", "Drizzle with honey", "Enjoy immediately"],
            "dietaryTags": ["vegetarian"],
        },
        {
            "id": "default-6",
            "name": "Black Bean Tacos",
            "description": "Hearty black bean tacos with avocado and fresh salsa",
            "mealType": "dinner",
            "prepTime": 10,
            "cookTime": 10,
            "servings": 4,
            "nutrition": {"calories": 340, "protein": 12, "carbs": 48, "fat": 14, "fiber": 14},
            "ingredients": ["2 cans black beans", "8 corn tortillas", "2 avocados", "1 cup salsa", "1/4 cup cilantro", "2 limes"],
            "instructions": ["Heat and season black beans", "Warm tortillas", "Assemble tacos with beans, avocado, salsa, and cilantro"],
            "dietaryTags": ["vegetarian", "vegan", "dairy-free"],
        },
        {
            "id": "default-7",
            "name": "Spinach Salad with Salmon",
            "description": "Fresh spinach salad topped with grilled salmon and balsamic vinaigrette",
            "mealType": "lunch",
            "prepTime": 10,
            "cookTime": 12,
            "servings": 2,
            "nutrition": {"calories": 450, "protein": 38, "carbs": 12, "fat": 28, "fiber": 4},
            "ingredients": ["2 salmon fillets", "4 cups baby spinach", "1/4 cup walnuts", "2 tbsp balsamic vinegar", "2 tbsp olive oil"],
            "instructions": ["Grill salmon until cooked through", "Arrange spinach and top with salmon", "Drizzle with balsamic vinaigrette"],
            "dietaryTags": ["gluten-free", "dairy-free", "high-protein"],
        },
    ]
