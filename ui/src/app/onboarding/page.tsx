"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MahmLogo } from "@/components/brand/MahmLogo";
import { useAuth } from "@/contexts/AuthContext";
import { generateMealPlan } from "@/lib/api";

const steps = [
  { id: 1, title: "Welcome", icon: "👋" },
  { id: 2, title: "Diet", icon: "🥗" },
  { id: 3, title: "Allergies", icon: "⚠️" },
  { id: 4, title: "Goals", icon: "🎯" },
  { id: 5, title: "Budget", icon: "💰" },
  { id: 6, title: "Pantry", icon: "🏠" },
];

const dietaryOptions = [
  { id: "vegetarian", label: "Vegetarian", icon: "🥬" },
  { id: "vegan", label: "Vegan", icon: "🌱" },
  { id: "pescatarian", label: "Pescatarian", icon: "🐟" },
  { id: "gluten-free", label: "Gluten-Free", icon: "🌾" },
  { id: "dairy-free", label: "Dairy-Free", icon: "🥛" },
  { id: "keto", label: "Keto", icon: "🥑" },
  { id: "paleo", label: "Paleo", icon: "🍖" },
  { id: "halal", label: "Halal", icon: "☪️" },
  { id: "kosher", label: "Kosher", icon: "✡️" },
  { id: "none", label: "No restrictions", icon: "✨" },
];

const allergyOptions = [
  { id: "peanuts", label: "Peanuts", icon: "🥜" },
  { id: "tree-nuts", label: "Tree Nuts", icon: "🌰" },
  { id: "dairy", label: "Dairy", icon: "🧀" },
  { id: "eggs", label: "Eggs", icon: "🥚" },
  { id: "shellfish", label: "Shellfish", icon: "🦐" },
  { id: "fish", label: "Fish", icon: "🐟" },
  { id: "soy", label: "Soy", icon: "🫘" },
  { id: "wheat", label: "Wheat/Gluten", icon: "🌾" },
  { id: "sesame", label: "Sesame", icon: "🫓" },
  { id: "none", label: "No allergies", icon: "✅" },
];

const goalOptions = [
  { id: "weight-loss", label: "Lose weight", icon: "⬇️", color: "coral" },
  { id: "weight-gain", label: "Gain weight", icon: "⬆️", color: "lime" },
  { id: "muscle", label: "Build muscle", icon: "💪", color: "purple" },
  { id: "energy", label: "More energy", icon: "⚡", color: "sunny" },
  { id: "health", label: "Eat healthier", icon: "🥗", color: "lime" },
  { id: "save-money", label: "Save money", icon: "💵", color: "lime" },
  { id: "learn-cooking", label: "Learn to cook", icon: "👩‍🍳", color: "coral" },
  { id: "save-time", label: "Save time", icon: "⏰", color: "sunny" },
];

const commonPantryItems = [
  { category: "Oils & Vinegars", items: ["Olive oil", "Vegetable oil", "Sesame oil", "Balsamic vinegar", "Rice vinegar"] },
  { category: "Spices", items: ["Salt", "Pepper", "Garlic powder", "Onion powder", "Cumin", "Paprika", "Cinnamon", "Oregano", "Basil", "Red pepper flakes"] },
  { category: "Sauces", items: ["Soy sauce", "Hot sauce", "Worcestershire", "Mustard", "Ketchup", "Mayo"] },
  { category: "Grains & Pasta", items: ["Rice", "Pasta", "Quinoa", "Oats", "Bread", "Flour"] },
  { category: "Canned Goods", items: ["Canned tomatoes", "Tomato paste", "Coconut milk", "Beans", "Chickpeas"] },
  { category: "Basics", items: ["Sugar", "Brown sugar", "Honey", "Maple syrup", "Vanilla extract"] },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    dietary: [] as string[],
    allergies: [] as string[],
    dislikes: "",
    goals: [] as string[],
    budget: 100,
    cookingTime: 30,
    householdSize: 2,
    skillLevel: "beginner",
    pantryItems: [] as string[],
  });

  const toggleSelection = (field: "dietary" | "allergies" | "goals", value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }));
  };

  const togglePantryItem = (item: string) => {
    setFormData(prev => ({
      ...prev,
      pantryItems: prev.pantryItems.includes(item)
        ? prev.pantryItems.filter(i => i !== item)
        : [...prev.pantryItems, item]
    }));
  };

  const nextStep = async () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      setSubmitting(true);
      setSubmitError(null);
      const email = formData.email?.trim();
      const password = formData.password;
      const name = formData.name.trim() || email?.split("@")[0] || "Guest";
      if (!email || !password) {
        setSubmitError("Email and password are required");
        setSubmitting(false);
        return;
      }
      if (password.length < 6) {
        setSubmitError("Password must be at least 6 characters");
        setSubmitting(false);
        return;
      }
      try {
        await registerUser({
          name,
          email,
          password,
          profile: {
            dietary: formData.dietary,
            allergies: formData.allergies,
            dislikes: formData.dislikes,
            goals: formData.goals,
            budget: formData.budget,
            cookingTime: formData.cookingTime,
            householdSize: formData.householdSize,
            skillLevel: formData.skillLevel,
            pantryItems: formData.pantryItems,
          },
        });

        // Store profile locally for quick access
        localStorage.setItem("mahm_user_profile", JSON.stringify(formData));

        // Generate personalized meal plan based on preferences
        try {
          const meals = await generateMealPlan({
            dietary: formData.dietary,
            allergies: formData.allergies,
            dislikes: formData.dislikes,
            goals: formData.goals,
            budget: formData.budget,
            cookingTime: formData.cookingTime,
            householdSize: formData.householdSize,
            skillLevel: formData.skillLevel,
          });
          localStorage.setItem("mahm_generated_meals", JSON.stringify(meals));
        } catch {
          // Meal generation failed, will use defaults
          console.warn("Meal generation failed, using defaults");
        }

        router.push("/");
      } catch (e) {
        // Registration failed - show error but don't redirect
        setSubmitError(e instanceof Error ? e.message : "Could not create account. Please try again.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Warm background elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl translate-x-1/2" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-secondary/30 rounded-full blur-3xl translate-y-1/2" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-accent/15 rounded-full blur-3xl" />

      <div className="relative max-w-2xl mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={`flex items-center ${idx < steps.length - 1 ? "flex-1" : ""}`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all ${
                    currentStep >= step.id
                      ? "bg-primary text-primary-foreground shadow-warm"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.icon}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                      currentStep > step.id ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {steps.length}
            </span>
          </div>
        </div>

        {/* Step Content */}
        <Card className="p-8 border border-primary/20 shadow-warm">
          {/* Step 1: Welcome */}
          {currentStep === 1 && (
            <div className="text-center">
              <div className="mb-6">
                <MahmLogo size="xl" />
              </div>
              <h1 className="font-display text-4xl font-bold text-foreground mb-4">
                Welcome to <span className="text-primary">Mahm</span>!
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Your AI-powered nutritionist, meal planner, and grocery guru.
                Let&apos;s get to know you so we can cook up something amazing!
              </p>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-primary/10 rounded-2xl">
                  <div className="text-3xl mb-2">🍳</div>
                  <div className="font-display font-bold text-foreground">Personalized Meals</div>
                  <div className="text-xs text-muted-foreground">Based on your preferences</div>
                </div>
                <div className="p-4 bg-accent/10 rounded-2xl">
                  <div className="text-3xl mb-2">💰</div>
                  <div className="font-display font-bold text-foreground">Best Prices</div>
                  <div className="text-xs text-muted-foreground">Local store comparison</div>
                </div>
                <div className="p-4 bg-secondary rounded-2xl">
                  <div className="text-3xl mb-2">📅</div>
                  <div className="font-display font-bold text-foreground">Weekly Plans</div>
                  <div className="text-xs text-muted-foreground">Auto grocery lists</div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="font-display font-bold text-foreground mb-2 block">Your name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your name..."
                    className="w-full p-4 border-2 border-primary/30 rounded-2xl font-display text-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="font-display font-bold text-foreground mb-2 block">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full p-4 border-2 border-primary/30 rounded-2xl font-display text-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="font-display font-bold text-foreground mb-2 block">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="At least 6 characters"
                    minLength={6}
                    className="w-full p-4 border-2 border-primary/30 rounded-2xl font-display text-lg focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Dietary */}
          {currentStep === 2 && (
            <div>
              <div className="text-center mb-6">
                <div className="text-5xl mb-4 animate-bounce-subtle">🥗</div>
                <h2 className="font-display text-3xl font-bold text-foreground mb-2">
                  Any dietary preferences?
                </h2>
                <p className="text-muted-foreground">
                  Select all that apply - we&apos;ll make sure every recipe fits!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {dietaryOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => toggleSelection("dietary", option.id)}
                    className={`p-4 rounded-2xl text-left transition-all ${
                      formData.dietary.includes(option.id)
                        ? "bg-primary text-primary-foreground shadow-warm scale-105"
                        : "bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    <span className="text-2xl mr-2">{option.icon}</span>
                    <span className="font-bold">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Allergies */}
          {currentStep === 3 && (
            <div>
              <div className="text-center mb-6">
                <div className="text-5xl mb-4 animate-wiggle">⚠️</div>
                <h2 className="font-display text-3xl font-bold text-foreground mb-2">
                  Any food allergies?
                </h2>
                <p className="text-muted-foreground">
                  Safety first! We&apos;ll never recommend anything with these.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {allergyOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => toggleSelection("allergies", option.id)}
                    className={`p-4 rounded-2xl text-left transition-all ${
                      formData.allergies.includes(option.id)
                        ? "bg-destructive text-white shadow-lg scale-105"
                        : "bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    <span className="text-2xl mr-2">{option.icon}</span>
                    <span className="font-bold">{option.label}</span>
                  </button>
                ))}
              </div>

              <div>
                <label className="font-bold text-foreground mb-2 block">
                  Any foods you just don&apos;t like?
                </label>
                <textarea
                  value={formData.dislikes}
                  onChange={(e) => setFormData({ ...formData, dislikes: e.target.value })}
                  placeholder="e.g., cilantro, olives, mushrooms..."
                  className="w-full p-4 border-2 border-border rounded-2xl resize-none h-20 focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          )}

          {/* Step 4: Goals */}
          {currentStep === 4 && (
            <div>
              <div className="text-center mb-6">
                <div className="text-5xl mb-4 animate-sparkle">🎯</div>
                <h2 className="font-display text-3xl font-bold text-foreground mb-2">
                  What are your goals?
                </h2>
                <p className="text-muted-foreground">
                  Pick as many as you like - we&apos;ll optimize your meals!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {goalOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => toggleSelection("goals", option.id)}
                    className={`p-4 rounded-2xl text-left transition-all ${
                      formData.goals.includes(option.id)
                        ? "bg-primary text-primary-foreground shadow-warm scale-105"
                        : "bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    <span className="text-2xl mr-2">{option.icon}</span>
                    <span className="font-bold">{option.label}</span>
                  </button>
                ))}
              </div>

              <div>
                <label className="font-bold text-foreground mb-2 block">
                  Cooking skill level
                </label>
                <div className="flex gap-2">
                  {[
                    { id: "beginner", label: "Beginner", desc: "Keep it simple!" },
                    { id: "intermediate", label: "Intermediate", desc: "I can handle it" },
                    { id: "advanced", label: "Advanced", desc: "Challenge me!" },
                  ].map((level) => (
                    <button
                      key={level.id}
                      onClick={() => setFormData({ ...formData, skillLevel: level.id })}
                      className={`flex-1 p-3 rounded-xl text-center transition-all ${
                        formData.skillLevel === level.id
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted/50 hover:bg-muted"
                      }`}
                    >
                      <div className="font-bold">{level.label}</div>
                      <div className="text-xs opacity-80">{level.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Budget & Time */}
          {currentStep === 5 && (
            <div>
              <div className="text-center mb-6">
                <div className="text-5xl mb-4 animate-float">💰</div>
                <h2 className="font-display text-3xl font-bold text-foreground mb-2">
                  Budget & Time
                </h2>
                <p className="text-muted-foreground">
                  We&apos;ll find recipes that fit your lifestyle!
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="font-bold text-foreground mb-3 block">
                    Weekly grocery budget
                  </label>
                  <div className="flex items-center gap-4">
                    <span className="text-4xl font-display font-bold text-primary">${formData.budget}</span>
                    <input
                      type="range"
                      min="30"
                      max="300"
                      step="10"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: parseInt(e.target.value) })}
                      className="flex-1 h-3 rounded-full appearance-none bg-primary/20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>$30/week</span>
                    <span>$300/week</span>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-foreground mb-3 block">
                    Time for cooking (weeknights)
                  </label>
                  <div className="flex gap-2">
                    {[15, 30, 45, 60, 90].map((time) => (
                      <button
                        key={time}
                        onClick={() => setFormData({ ...formData, cookingTime: time })}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                          formData.cookingTime === time
                            ? "bg-secondary text-secondary-foreground shadow-warm"
                            : "bg-muted/50 hover:bg-muted"
                        }`}
                      >
                        {time}m
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-foreground mb-3 block">
                    Household size
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5, 6].map((size) => (
                      <button
                        key={size}
                        onClick={() => setFormData({ ...formData, householdSize: size })}
                        className={`w-14 h-14 rounded-xl font-bold text-xl transition-all ${
                          formData.householdSize === size
                            ? "bg-accent text-accent-foreground shadow-warm"
                            : "bg-muted/50 hover:bg-muted"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Pantry */}
          {currentStep === 6 && (
            <div>
              <div className="text-center mb-6">
                <div className="text-5xl mb-4 animate-bounce-subtle">🏠</div>
                <h2 className="font-display text-3xl font-bold text-foreground mb-2">
                  What&apos;s in your pantry?
                </h2>
                <p className="text-muted-foreground">
                  Tell us what you already have - we won&apos;t add these to your grocery list!
                </p>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {commonPantryItems.map((category) => (
                  <div key={category.category}>
                    <h3 className="font-bold text-foreground mb-2">{category.category}</h3>
                    <div className="flex flex-wrap gap-2">
                      {category.items.map((item) => (
                        <button
                          key={item}
                          onClick={() => togglePantryItem(item)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            formData.pantryItems.includes(item)
                              ? "bg-accent text-accent-foreground"
                              : "bg-muted/50 hover:bg-muted text-foreground"
                          }`}
                        >
                          {formData.pantryItems.includes(item) ? "✓ " : ""}{item}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-accent/10 rounded-2xl">
                <div className="font-bold text-foreground mb-1">
                  {formData.pantryItems.length} items marked as "already have"
                </div>
                <div className="text-sm text-muted-foreground">
                  You can always update this later in your profile!
                </div>
              </div>
            </div>
          )}

          {submitError && (
            <p className="mt-4 text-sm text-amber-600 bg-amber-50 p-2 rounded-lg">{submitError}</p>
          )}
          {/* Navigation Buttons */}
          <div className="flex gap-4 mt-8">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={prevStep}
                className="flex-1 border-2 font-bold"
              >
                ← Back
              </Button>
            )}
            <Button
              onClick={nextStep}
              disabled={submitting}
              className={`flex-1 font-display font-bold text-lg py-6 shadow-warm hover:shadow-warm-lg transition-all ${
                currentStep === steps.length ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
              }`}
            >
              {submitting ? "Setting up…" : currentStep === steps.length ? "Let's Cook! 🍳" : "Continue →"}
            </Button>
          </div>
        </Card>

        {/* Login option */}
        {currentStep === 1 && (
          <div className="text-center mt-4">
            <button
              onClick={() => router.push("/?login=true")}
              className="text-muted-foreground hover:text-primary text-sm"
            >
              Already have an account? Log in →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
