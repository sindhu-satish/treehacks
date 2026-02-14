"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dummyUserProfile } from "@/lib/dummy-data";

const dietaryOptions = [
  "vegetarian",
  "vegan",
  "pescatarian",
  "gluten-free",
  "dairy-free",
  "keto",
  "paleo",
  "halal",
  "kosher",
];

const allergyOptions = [
  "lactose",
  "gluten",
  "nuts",
  "peanuts",
  "shellfish",
  "eggs",
  "soy",
  "fish",
];

const healthGoalOptions = [
  "weight loss",
  "weight gain",
  "muscle building",
  "more energy",
  "better sleep",
  "heart health",
  "gut health",
  "reduce inflammation",
];

const skillLevels = [
  { value: "beginner", label: "Beginner", description: "New to cooking, prefer simple recipes" },
  { value: "intermediate", label: "Intermediate", description: "Comfortable with most techniques" },
  { value: "advanced", label: "Advanced", description: "Enjoy complex recipes and challenges" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState(dummyUserProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [newDislikedFood, setNewDislikedFood] = useState("");

  const toggleDietaryRestriction = (restriction: string) => {
    setProfile((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        dietaryRestrictions: prev.preferences.dietaryRestrictions.includes(restriction)
          ? prev.preferences.dietaryRestrictions.filter((r) => r !== restriction)
          : [...prev.preferences.dietaryRestrictions, restriction],
      },
    }));
  };

  const toggleAllergy = (allergy: string) => {
    setProfile((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        allergies: prev.preferences.allergies.includes(allergy)
          ? prev.preferences.allergies.filter((a) => a !== allergy)
          : [...prev.preferences.allergies, allergy],
      },
    }));
  };

  const toggleHealthGoal = (goal: string) => {
    setProfile((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        healthGoals: prev.preferences.healthGoals.includes(goal)
          ? prev.preferences.healthGoals.filter((g) => g !== goal)
          : [...prev.preferences.healthGoals, goal],
      },
    }));
  };

  const addDislikedFood = () => {
    if (newDislikedFood.trim() && !profile.preferences.dislikedFoods.includes(newDislikedFood.trim())) {
      setProfile((prev) => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          dislikedFoods: [...prev.preferences.dislikedFoods, newDislikedFood.trim()],
        },
      }));
      setNewDislikedFood("");
    }
  };

  const removeDislikedFood = (food: string) => {
    setProfile((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        dislikedFoods: prev.preferences.dislikedFoods.filter((f) => f !== food),
      },
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-hero border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/")}
              className="text-muted-foreground hover:text-charcoal"
            >
              ← Back
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-charcoal">Your Profile</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Header */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full gradient-coral flex items-center justify-center text-white text-2xl font-bold">
              {profile.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-charcoal">{profile.name}</h2>
              <p className="text-muted-foreground">{profile.email}</p>
            </div>
          </div>
        </Card>

        {/* Dietary Restrictions */}
        <Card className="p-6">
          <h3 className="font-bold text-charcoal mb-4">Dietary Restrictions</h3>
          <div className="flex flex-wrap gap-2">
            {dietaryOptions.map((option) => (
              <button
                key={option}
                onClick={() => toggleDietaryRestriction(option)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  profile.preferences.dietaryRestrictions.includes(option)
                    ? "bg-coral text-white"
                    : "bg-muted/50 text-charcoal hover:bg-muted"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </Card>

        {/* Allergies */}
        <Card className="p-6">
          <h3 className="font-bold text-charcoal mb-4">Allergies & Intolerances</h3>
          <div className="flex flex-wrap gap-2">
            {allergyOptions.map((option) => (
              <button
                key={option}
                onClick={() => toggleAllergy(option)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  profile.preferences.allergies.includes(option)
                    ? "bg-destructive text-white"
                    : "bg-muted/50 text-charcoal hover:bg-muted"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </Card>

        {/* Foods You Dislike */}
        <Card className="p-6">
          <h3 className="font-bold text-charcoal mb-4">Foods You Dislike</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Mahm will never recommend recipes with these ingredients
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {profile.preferences.dislikedFoods.map((food) => (
              <Badge
                key={food}
                className="bg-muted/50 text-charcoal border-0 px-3 py-1.5 cursor-pointer hover:bg-destructive/20"
                onClick={() => removeDislikedFood(food)}
              >
                {food} ×
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newDislikedFood}
              onChange={(e) => setNewDislikedFood(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addDislikedFood()}
              placeholder="Add a food you dislike..."
              className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-coral/50"
            />
            <Button onClick={addDislikedFood} className="gradient-coral text-white">
              Add
            </Button>
          </div>
        </Card>

        {/* Health Goals */}
        <Card className="p-6">
          <h3 className="font-bold text-charcoal mb-4">Health Goals</h3>
          <div className="flex flex-wrap gap-2">
            {healthGoalOptions.map((option) => (
              <button
                key={option}
                onClick={() => toggleHealthGoal(option)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  profile.preferences.healthGoals.includes(option)
                    ? "bg-lime text-white"
                    : "bg-muted/50 text-charcoal hover:bg-muted"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </Card>

        {/* Cooking Skill */}
        <Card className="p-6">
          <h3 className="font-bold text-charcoal mb-4">Cooking Skill Level</h3>
          <div className="space-y-3">
            {skillLevels.map((level) => (
              <button
                key={level.value}
                onClick={() =>
                  setProfile((prev) => ({
                    ...prev,
                    preferences: {
                      ...prev.preferences,
                      cookingSkill: level.value as "beginner" | "intermediate" | "advanced",
                    },
                  }))
                }
                className={`w-full p-4 rounded-xl text-left transition-all ${
                  profile.preferences.cookingSkill === level.value
                    ? "bg-coral/10 border-2 border-coral"
                    : "bg-muted/30 border-2 border-transparent hover:border-border"
                }`}
              >
                <div className="font-semibold text-charcoal">{level.label}</div>
                <div className="text-sm text-muted-foreground">{level.description}</div>
              </button>
            ))}
          </div>
        </Card>

        {/* Budget & Time */}
        <Card className="p-6">
          <h3 className="font-bold text-charcoal mb-4">Budget & Time</h3>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-charcoal mb-2 block">
                Weekly grocery budget
              </label>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-charcoal">$</span>
                <input
                  type="number"
                  value={profile.preferences.budget}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      preferences: {
                        ...prev.preferences,
                        budget: parseInt(e.target.value) || 0,
                      },
                    }))
                  }
                  className="w-24 px-4 py-2 border border-border rounded-lg text-center font-semibold focus:outline-none focus:ring-2 focus:ring-coral/50"
                />
                <span className="text-muted-foreground">per week</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-charcoal mb-2 block">
                Time available for cooking (weeknights)
              </label>
              <div className="flex gap-2">
                {[15, 30, 45, 60].map((time) => (
                  <button
                    key={time}
                    onClick={() =>
                      setProfile((prev) => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          availableTime: time,
                        },
                      }))
                    }
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      profile.preferences.availableTime === time
                        ? "bg-coral text-white"
                        : "bg-muted/50 text-charcoal hover:bg-muted"
                    }`}
                  >
                    {time} min
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-charcoal mb-2 block">
                Household size
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6].map((size) => (
                  <button
                    key={size}
                    onClick={() =>
                      setProfile((prev) => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          householdSize: size,
                        },
                      }))
                    }
                    className={`w-12 h-12 rounded-lg text-sm font-medium transition-all ${
                      profile.preferences.householdSize === size
                        ? "bg-coral text-white"
                        : "bg-muted/50 text-charcoal hover:bg-muted"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <Button className="w-full gradient-coral text-white" size="lg">
          Save Changes
        </Button>
      </main>
    </div>
  );
}
