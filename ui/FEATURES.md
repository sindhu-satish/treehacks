# Mahm UI - Feature Documentation & API Requirements

## Overview

**Mahm** is an AI-powered nutritionist and meal planning application with the tagline *"Like having a mom who's also a nutritionist."* The app helps users get personalized meal recommendations, compare grocery prices across local stores, and plan their weekly meals.

---

## Pages & Features

### 1. Landing Page (`/`)

**Before Onboarding:**
- Hero section with app value proposition
- Feature cards (Personalized Meals, Best Prices, Weekly Plans)
- "Get Started Free" → Onboarding flow
- "Try Demo" → Skip to main app

**After Onboarding - 4-Tab Interface:**

#### Chat Tab
- Conversational AI chat with "Mahm"
- Message history with date separators
- Typing indicator when AI responds
- Tool badges showing AI actions (search_recipes, find_stores, etc.)
- Side panel with recommended recipes
- Inline marketplace results when discussing ingredients

#### Marketplace Tab
- Zip code input for location
- "Find Stores" button with loading animation
- Price comparison grid showing ingredient prices across stores
- Select cheapest option or manually pick stores
- Shopping cart with:
  - Items grouped by store
  - Quantity adjustment (+/-)
  - Store subtotals and total cost
  - Checkout button

#### Meal Calendar Tab
- 7-day calendar grid with week navigation
- Meal type toggles (Breakfast, Lunch, Dinner, Snacks, Dessert)
- Hover actions per meal:
  - 🔄 Swap meal
  - ✨ Regenerate new suggestion
  - 🍽️ Mark as eating out
  - × Skip meal
- Daily nutrition totals (calories, protein)
- Weekly cost estimate
- Integrated grocery list by category
- Nutrition summary dashboard

#### Photo Log Tab
- **Log a Meal**: Upload photo, mark as planned/unplanned, select meal type
- **Recipe from Photo**: Upload restaurant dish photo → generate homemade recipe
- Recent meal photos gallery

---

### 2. Onboarding Page (`/onboarding`)

**6-Step Flow:**
1. **Welcome** - Name input, feature preview
2. **Diet** - Dietary restrictions (vegetarian, vegan, keto, halal, etc.)
3. **Allergies** - Food allergies + disliked foods
4. **Goals** - Health goals (weight loss, muscle, energy) + cooking skill level
5. **Budget & Time** - Weekly budget ($30-$300), cooking time, household size
6. **Pantry** - Mark items already owned (oils, spices, grains, etc.)

---

### 3. Profile Page (`/profile`)

- Profile header with avatar
- Editable sections:
  - Dietary restrictions
  - Allergies & intolerances
  - Disliked foods (add/remove)
  - Health goals
  - Cooking skill level
  - Weekly budget
  - Available cooking time
  - Household size
- Save button with success feedback
- Persists to localStorage

---

### 4. Saved Recipes Page (`/saved`)

**3-Tab Interface:**

#### Saved Recipes Tab
- Grid of saved recipe cards
- Click to view full recipe

#### Made Recipes Tab (Cooking Journal)
- Recipes user has cooked
- "Made X times" badge
- Journal entries with date, rating, notes

#### Inspiration Tab
- Paste URL from TikTok/Instagram/YouTube
- Extract recipe from video content
- Grid of short-form content cards
- Platform badges and extraction status

---

### 5. Recipe Detail Page (`/recipe/[id]`)

**Top Section:**
- Recipe name, description
- Stats: total time, servings, cuisine, difficulty
- Dietary tags
- Cost with cheapest store
- Save button (heart)

**4-Tab Interface:**

#### Ingredients Tab
- Ingredient list with store price buttons
- "Select All Cheapest" button
- Add to cart functionality
- Floating cart summary

#### Instructions Tab
- Numbered cooking steps

#### Nutrition Tab
- Calories, protein, carbs, fat, fiber per serving

#### My History Tab
- Previous cooking instances
- Ratings and notes

**Actions:**
- "Add to Meal Plan" button
- "I Made This!" button → Log with rating, notes, photo

---

## Data Models

### Core Types

```typescript
Recipe {
  id, name, description
  ingredients: Ingredient[]
  instructions: string[]
  prepTime, cookTime, servings
  nutrition: NutritionInfo
  dietaryTags, cuisine, difficulty
  estimatedCost, cheapestStore
  isSaved, madeCount
}

MealPlan {
  id, startDate, endDate
  days: MealDay[]
  totalCost
  groceryList: GroceryItem[]
}

UserProfile {
  id, name, email
  preferences: UserPreferences
  savedRecipes[], madeRecipes[]
}

CartItem {
  id, ingredient, storeId, storeName
  price, quantity, unit
}
```

---

## APIs Required

### 1. Chat & AI APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/message` | POST | Send message, get AI response |
| `/api/chat/search-recipes` | POST | Search recipes based on preferences |
| `/api/chat/get-nutrition` | POST | Analyze nutrition from description |
| `/api/chat/find-stores` | POST | Find stores near location |

### 2. Recipe APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/recipes` | GET | List all recipes |
| `/api/recipes/[id]` | GET | Get single recipe |
| `/api/recipes/generate` | POST | Generate recipe from photo |
| `/api/recipes/extract-from-video` | POST | Extract recipe from video URL |
| `/api/recipes/[id]/save` | POST | Save recipe to profile |
| `/api/recipes/[id]/rate` | POST | Log as made with rating |

### 3. User/Profile APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/user/profile` | GET | Get user profile |
| `/api/user/profile` | PUT | Update preferences |
| `/api/user/saved-recipes` | GET | Get saved recipes |
| `/api/user/made-recipes` | GET | Get cooking journal |
| `/api/user/meal-logs` | GET | Get meal logs |

### 4. Meal Planning APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/meal-plans` | GET | Get user's meal plans |
| `/api/meal-plans` | POST | Generate new meal plan |
| `/api/meal-plans/[id]` | PUT | Update meal plan |
| `/api/meal-plans/[id]/swap-meal` | POST | Swap meal in plan |
| `/api/meal-plans/[id]/regenerate-meal` | POST | Generate new suggestion |
| `/api/meal-plans/[id]/grocery-list` | GET | Get grocery list |

### 5. Marketplace/Pricing APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stores` | GET | Get stores near location |
| `/api/stores/[id]/prices` | GET | Get prices at store |
| `/api/marketplace/compare-prices` | POST | Compare ingredient prices |

### 6. Shopping Cart APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cart` | GET | Get current cart |
| `/api/cart/add` | POST | Add item to cart |
| `/api/cart/update` | POST | Update quantity |
| `/api/cart/[itemId]` | DELETE | Remove from cart |

### 7. Meal Logging APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/meal-logs` | POST | Log meal with photo |
| `/api/meal-logs/analyze` | POST | Analyze photo for nutrition |

### 8. Authentication APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User login |
| `/api/auth/logout` | POST | User logout |

---

## Third-Party Integrations Needed

| Service | Purpose |
|---------|---------|
| **BrightData / Web Scraping** | Real-time store pricing data |
| **Google Vision API** | Photo analysis for meals and recipes |
| **OpenAI / Claude API** | Chat AI and recipe generation |
| **Food Database API** | Nutrition information lookup |
| **Google Calendar API** | Sync meal plans to calendar |
| **TikTok/Instagram/YouTube APIs** | Extract recipe content from videos |

---

## Currently Mocked (Needs Backend)

- All AI chat responses
- Recipe generation from photos
- Recipe extraction from videos
- Store finding and pricing
- Meal nutrition analysis
- Checkout process
- Calendar synchronization

---

## Current State Management

**MahmContext** provides:
- Cart management (add, remove, update quantity)
- Grocery list with "already have" tracking
- Pantry items
- Meal selection and swapping
- Meal logging
- Nutrition tracking

**Persistence:** All state saved to localStorage with keys:
- `mahm_cart`
- `mahm_pantry`
- `mahm_meal_logs`
- `mahm_grocery_list`
- `mahm_user_profile`
- `mahm_onboarded`
