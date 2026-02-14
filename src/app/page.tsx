"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { GroceryComparison } from "@/components/marketplace/GroceryComparison";
import { MealCalendar } from "@/components/calendar/MealCalendar";
import { GroceryList } from "@/components/calendar/GroceryList";
import {
  dummyRecipes,
  dummyGroceryComparison,
  dummyMealPlan,
  dummyChatHistory,
} from "@/lib/dummy-data";
import { ChatMessage as ChatMessageType } from "@/types";

export default function Home() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessageType[]>(dummyChatHistory);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [showRecipes, setShowRecipes] = useState(true);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const lowerContent = content.toLowerCase();
      let response: ChatMessageType;

      if (lowerContent.includes("where") && (lowerContent.includes("buy") || lowerContent.includes("ingredient") || lowerContent.includes("store"))) {
        // Marketplace response
        response = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Great question! I found the ingredients for Creamy Lentil Dal at 3 stores near you. Here's the price breakdown:\n\n**Best deals:**\n- Red lentils are cheapest at **Trader Joe's** ($2.99)\n- Coconut milk is also best at **Trader Joe's** ($1.99)\n- Spinach is cheapest at **Safeway** ($2.29)\n\nYou could save about $3.50 by shopping at Trader Joe's for most items! Want me to plan your whole week so you can do one efficient shopping trip?",
          timestamp: new Date(),
          toolCalls: [
            { id: "tc1", name: "find_stores", status: "complete" },
          ],
        };
        setShowMarketplace(true);
      } else if (lowerContent.includes("plan") && (lowerContent.includes("week") || lowerContent.includes("meal"))) {
        // Meal plan response
        response = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I've put together a week of delicious meals for you! Here's what I came up with:\n\n**Your 7-day plan includes:**\n- 21 meals (breakfast, lunch, dinner)\n- All vegetarian & dairy-free\n- Average 1,400 cal/day (great for weight loss)\n- High protein to keep you full\n- No tofu anywhere!\n\n**Total grocery cost: $73** (under your $80 budget!)\n\nI've also synced this to your Google Calendar with prep reminders. The grocery list has 23 items - I'd recommend doing your shopping Sunday morning.\n\nWhat do you think? Want me to swap anything out?",
          timestamp: new Date(),
          toolCalls: [
            { id: "tc1", name: "generate_meal_plan", status: "complete" },
            { id: "tc2", name: "find_stores", status: "complete" },
          ],
        };
        setActiveTab("calendar");
      } else if (lowerContent.includes("love") || lowerContent.includes("great") || lowerContent.includes("perfect") || lowerContent.includes("sounds good")) {
        response = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Yay! So glad you like it!\n\nA few tips for your cooking journey:\n\n1. **Start with the dal** - it's super forgiving and makes great leftovers\n2. **Prep your spices** in advance - makes weeknight cooking way faster\n3. **Don't skip the spinach** in the dal - it adds iron, which is important since you mentioned feeling tired\n\nNeed me to find where to buy ingredients, or want to see your full week plan?",
          timestamp: new Date(),
        };
      } else {
        // Default recipe recommendation response
        response = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Based on what you've told me, I think you'll love these options! Each one is:\n\n- Vegetarian & dairy-free\n- Under 30 minutes\n- Beginner-friendly (no fancy techniques)\n- High in protein for weight loss\n- Budget-friendly\n\nTake a look and let me know which catches your eye - I can find the ingredients at stores near you, or plan out your whole week!",
          timestamp: new Date(),
          toolCalls: [
            { id: "tc1", name: "search_recipes", status: "complete" },
            { id: "tc2", name: "get_nutrition", status: "complete" },
          ],
        };
        setShowRecipes(true);
      }

      setMessages((prev) => [...prev, response]);
      setIsTyping(false);
    }, 1500);
  };

  const groceryListItems = [
    { name: "Red lentils", amount: "2 cups", category: "grains", estimatedPrice: 2.99 },
    { name: "Coconut milk", amount: "2 cans", category: "canned", estimatedPrice: 3.98 },
    { name: "Chickpeas", amount: "4 cans", category: "canned", estimatedPrice: 3.96 },
    { name: "Black beans", amount: "4 cans", category: "canned", estimatedPrice: 3.96 },
    { name: "Fresh spinach", amount: "10 oz", category: "produce", estimatedPrice: 4.58 },
    { name: "Cauliflower", amount: "2 heads", category: "produce", estimatedPrice: 5.98 },
    { name: "Bell peppers", amount: "4 medium", category: "produce", estimatedPrice: 3.96 },
    { name: "Avocados", amount: "4 medium", category: "produce", estimatedPrice: 3.16 },
    { name: "Red cabbage", amount: "1 small", category: "produce", estimatedPrice: 2.49 },
    { name: "Onions", amount: "3 medium", category: "produce", estimatedPrice: 1.50 },
    { name: "Garlic", amount: "2 heads", category: "produce", estimatedPrice: 1.00 },
    { name: "Fresh ginger", amount: "1 piece", category: "produce", estimatedPrice: 0.75 },
    { name: "Limes", amount: "4", category: "produce", estimatedPrice: 1.00 },
    { name: "Cilantro", amount: "2 bunches", category: "produce", estimatedPrice: 1.98 },
    { name: "Corn tortillas", amount: "24 count", category: "grains", estimatedPrice: 3.49 },
    { name: "Turmeric", amount: "1 jar", category: "spices", estimatedPrice: 3.99 },
    { name: "Cumin", amount: "1 jar", category: "spices", estimatedPrice: 3.99 },
    { name: "Garam masala", amount: "1 jar", category: "spices", estimatedPrice: 4.99 },
    { name: "Curry powder", amount: "1 jar", category: "spices", estimatedPrice: 3.99 },
    { name: "Vegetable broth", amount: "2 cartons", category: "canned", estimatedPrice: 5.98 },
    { name: "Tomato paste", amount: "2 cans", category: "canned", estimatedPrice: 1.98 },
    { name: "Salsa verde", amount: "1 jar", category: "canned", estimatedPrice: 3.49 },
    { name: "Coconut cream", amount: "1 can", category: "canned", estimatedPrice: 2.49 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Hero Header */}
      <header className="gradient-hero border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/")}>
              <div className="w-10 h-10 rounded-xl gradient-coral flex items-center justify-center text-white text-xl font-bold shadow-lg">
                M
              </div>
              <div>
                <h1 className="text-xl font-bold text-charcoal">Mahm</h1>
                <p className="text-xs text-muted-foreground">Make At Home Mmmm</p>
              </div>
            </div>
            <nav className="flex items-center gap-2 md:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/saved")}
                className="text-muted-foreground hover:text-charcoal"
              >
                <span className="hidden sm:inline">My Recipes</span>
                <span className="sm:hidden">♥</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/profile")}
                className="text-muted-foreground hover:text-charcoal"
              >
                <span className="hidden sm:inline">Profile</span>
                <span className="sm:hidden">⚙</span>
              </Button>
              <div
                onClick={() => router.push("/profile")}
                className="w-8 h-8 rounded-full bg-charcoal text-white flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                A
              </div>
            </nav>
          </div>

          {/* Tagline - only show on landing */}
          {messages.length <= 1 && (
            <div className="mt-8 mb-4 text-center">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-charcoal mb-4">
                Like having a mom who&apos;s also a{" "}
                <span className="text-coral">nutritionist</span> and a{" "}
                <span className="text-lime">personal shopper</span>
              </h2>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                Tell Mahm your dietary needs, budget, and cravings. She&apos;ll recommend meals,
                find the cheapest local ingredients, and plan your whole week.
              </p>
              <div className="flex flex-wrap justify-center gap-3 mt-6">
                <span className="px-4 py-2 bg-coral/10 rounded-full text-sm font-medium text-coral">
                  Personalized nutrition
                </span>
                <span className="px-4 py-2 bg-lime/10 rounded-full text-sm font-medium text-lime">
                  Real local prices
                </span>
                <span className="px-4 py-2 bg-sunny/20 rounded-full text-sm font-medium text-charcoal">
                  Weekly meal plans
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-6xl mx-auto w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="border-b border-border/50 px-4">
            <TabsList className="bg-transparent h-auto p-0 gap-2 md:gap-4">
              <TabsTrigger
                value="chat"
                className="data-[state=active]:bg-transparent data-[state=active]:text-coral data-[state=active]:border-b-2 data-[state=active]:border-coral rounded-none px-1 pb-3 pt-4 font-semibold text-sm md:text-base"
              >
                Chat with Mahm
              </TabsTrigger>
              <TabsTrigger
                value="marketplace"
                className="data-[state=active]:bg-transparent data-[state=active]:text-coral data-[state=active]:border-b-2 data-[state=active]:border-coral rounded-none px-1 pb-3 pt-4 font-semibold text-sm md:text-base"
              >
                Marketplace
              </TabsTrigger>
              <TabsTrigger
                value="calendar"
                className="data-[state=active]:bg-transparent data-[state=active]:text-coral data-[state=active]:border-b-2 data-[state=active]:border-coral rounded-none px-1 pb-3 pt-4 font-semibold text-sm md:text-base"
              >
                Meal Calendar
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Chat Tab */}
          <TabsContent value="chat" className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden">
            <div className="flex-1 flex gap-4 p-4 overflow-hidden">
              {/* Chat Messages */}
              <div className="flex-1 flex flex-col min-w-0">
                <ScrollArea className="flex-1" ref={scrollRef}>
                  <div className="space-y-1 pb-4">
                    {messages.map((message) => (
                      <ChatMessage key={message.id} message={message} />
                    ))}
                    {isTyping && <TypingIndicator />}
                  </div>
                </ScrollArea>
              </div>

              {/* Side Panel - Recipes */}
              {showRecipes && (
                <div className="hidden lg:block w-80 shrink-0 overflow-y-auto">
                  <div className="sticky top-0 bg-background pb-2">
                    <h3 className="font-bold text-charcoal mb-3 flex items-center justify-between">
                      <span>Recommended for you</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/saved")}
                        className="text-coral text-xs"
                      >
                        View all →
                      </Button>
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {dummyRecipes.map((recipe) => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        compact
                        onSelect={() => router.push(`/recipe/${recipe.id}`)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Inline Marketplace Results */}
            {showMarketplace && activeTab === "chat" && (
              <div className="px-4 pb-4">
                <GroceryComparison comparisons={dummyGroceryComparison} />
              </div>
            )}

            <ChatInput onSend={handleSendMessage} disabled={isTyping} />
          </TabsContent>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="flex-1 p-4 mt-0 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-charcoal mb-2">Smart Marketplace</h2>
                <p className="text-muted-foreground">
                  Find the best prices for your ingredients at stores near you
                </p>
              </div>

              {/* Location Input */}
              <div className="flex items-center gap-3 mb-6 p-4 bg-white rounded-xl border border-border/50">
                <span className="text-xl">📍</span>
                <input
                  type="text"
                  placeholder="Enter your zip code"
                  defaultValue="94305"
                  className="flex-1 bg-transparent focus:outline-none text-charcoal"
                />
                <Button className="gradient-coral text-white">
                  Find stores
                </Button>
              </div>

              <GroceryComparison comparisons={dummyGroceryComparison} />
            </div>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="flex-1 p-4 mt-0 overflow-auto">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-charcoal mb-2">Your Meal Plan</h2>
                  <p className="text-muted-foreground">
                    Personalized weekly meals optimized for your goals
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" className="border-coral text-coral hover:bg-coral/10">
                    Sync to Calendar
                  </Button>
                  <Button className="gradient-coral text-white">
                    Regenerate Plan
                  </Button>
                </div>
              </div>

              <MealCalendar mealPlan={dummyMealPlan} />

              <div className="grid md:grid-cols-2 gap-6">
                <GroceryList items={groceryListItems} totalCost={73} />

                {/* Nutrition Summary */}
                <div className="bg-white rounded-2xl border border-border/50 p-4">
                  <h3 className="font-bold text-charcoal mb-4 flex items-center gap-2">
                    <span>Weekly Nutrition Summary</span>
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Avg. daily calories</span>
                      <span className="font-bold text-coral">1,395 cal</span>
                    </div>
                    <div className="w-full bg-muted/50 rounded-full h-2">
                      <div className="bg-coral h-2 rounded-full" style={{ width: "70%" }} />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Avg. daily protein</span>
                      <span className="font-bold text-lime">52g</span>
                    </div>
                    <div className="w-full bg-muted/50 rounded-full h-2">
                      <div className="bg-lime h-2 rounded-full" style={{ width: "85%" }} />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Avg. daily fiber</span>
                      <span className="font-bold text-sunny">30g</span>
                    </div>
                    <div className="w-full bg-muted/50 rounded-full h-2">
                      <div className="bg-sunny h-2 rounded-full" style={{ width: "100%" }} />
                    </div>

                    <div className="pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2 text-sm text-lime">
                        <span>✓</span>
                        <span>On track for your weight loss goal</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-lime mt-1">
                        <span>✓</span>
                        <span>High fiber for sustained energy</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-lime mt-1">
                        <span>✓</span>
                        <span>Under budget at $73/week</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-4 px-4 text-center text-sm text-muted-foreground">
        <p>
          Made with love at TreeHacks 2026 |{" "}
          <span className="font-medium text-coral">Mahm</span> — Make something your Mahm would be proud of
        </p>
      </footer>
    </div>
  );
}
