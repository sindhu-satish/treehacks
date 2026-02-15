"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MahmLogo } from "@/components/brand/MahmLogo";
import { getProfile, putProfile, type UserProfile } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { LoginModal } from "@/components/auth/LoginModal";

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

const defaultProfile: UserProfile = {
  id: "",
  zip: "",
  budget_weekly: 80,
  diet: "",
  allergies: [],
  dislikes: [],
  max_prep_minutes: 30,
  household_size: 1,
  prefs: {},
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [newDislikedFood, setNewDislikedFood] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const userId = user?.user_id ?? null;

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setError("Log in to load and save your profile");
      // Fallback to localStorage for anonymous users
      const saved = localStorage.getItem("mahm_user_profile");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setProfile({
            ...defaultProfile,
            ...parsed,
            allergies: Array.isArray(parsed.allergies) ? parsed.allergies : [],
            dislikes: Array.isArray(parsed.dislikes) ? parsed.dislikes : [],
          });
        } catch {
          /* ignore */
        }
      }
      return;
    }
    getProfile(userId)
      .then((p) =>
        setProfile({
          ...defaultProfile,
          ...p,
          allergies: Array.isArray(p.allergies) ? p.allergies : [],
          dislikes: Array.isArray(p.dislikes) ? p.dislikes : [],
        })
      )
      .catch(() => setError("Could not load profile"))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleSave = async () => {
    if (!userId) {
      // Anonymous: save to localStorage
      localStorage.setItem("mahm_user_profile", JSON.stringify(profile));
      setIsSaving(true);
      setTimeout(() => {
        setIsSaving(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }, 300);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const updated = await putProfile(userId, {
        zip: profile.zip,
        budget_weekly: profile.budget_weekly,
        diet: profile.diet,
        allergies: Array.isArray(profile.allergies) ? profile.allergies : [],
        dislikes: Array.isArray(profile.dislikes) ? profile.dislikes : [],
        max_prep_minutes: profile.max_prep_minutes,
        household_size: profile.household_size,
        prefs: profile.prefs,
      });
      setProfile({
        ...defaultProfile,
        ...updated,
        allergies: Array.isArray(updated.allergies) ? updated.allergies : [],
        dislikes: Array.isArray(updated.dislikes) ? updated.dislikes : [],
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDiet = (diet: string) => {
    setProfile((prev) => ({
      ...prev,
      diet: prev.diet === diet ? "" : diet,
    }));
  };

  const toggleAllergy = (allergy: string) => {
    setProfile((prev) => ({
      ...prev,
      allergies: prev.allergies.includes(allergy)
        ? prev.allergies.filter((a) => a !== allergy)
        : [...prev.allergies, allergy],
    }));
  };

  const addDislikedFood = () => {
    const t = newDislikedFood.trim();
    const dislikes = Array.isArray(profile.dislikes) ? profile.dislikes : [];
    if (t && !dislikes.includes(t)) {
      setProfile((prev) => ({ ...prev, dislikes: [...(Array.isArray(prev.dislikes) ? prev.dislikes : []), t] }));
      setNewDislikedFood("");
    }
  };

  const removeDislikedFood = (food: string) => {
    setProfile((prev) => ({
      ...prev,
      dislikes: (Array.isArray(prev.dislikes) ? prev.dislikes : []).filter((f) => f !== food),
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-hero border-b border-border/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="max-w-2xl mx-auto px-4 py-4 relative">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/")}
              className="text-muted-foreground hover:text-primary font-bold"
            >
              ← Back
            </Button>
            <div className="flex-1">
              <h1 className="font-display text-2xl font-bold text-foreground">Your Profile</h1>
            </div>
            {userId && (
              <Button
                variant="ghost"
                onClick={async () => {
                  await logout();
                  router.push("/");
                }}
                className="text-muted-foreground hover:text-destructive font-semibold"
              >
                Log out
              </Button>
            )}
            <MahmLogo size="sm" showText={false} />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="p-3 bg-muted/50 rounded-xl border border-border flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">{error}</span>
            <Button
              size="sm"
              className="gradient-coral text-white font-bold"
              onClick={() => setShowLoginModal(true)}
            >
              Log in
            </Button>
          </div>
        )}

        {showLoginModal && (
          <LoginModal
            onClose={() => setShowLoginModal(false)}
            onSuccess={() => {
              setShowLoginModal(false);
              setError(null);
            }}
          />
        )}

        {/* Zip */}
        <Card className="p-6 border-2 border-primary/20">
          <h3 className="font-display font-bold text-foreground mb-4 text-lg">📍 Zip Code</h3>
          <input
            type="text"
            value={profile.zip}
            onChange={(e) => setProfile((prev) => ({ ...prev, zip: e.target.value }))}
            placeholder="e.g. 94305"
            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </Card>

        {/* Budget */}
        <Card className="p-6 border-2 border-accent/20">
          <h3 className="font-display font-bold text-foreground mb-4 text-lg">💰 Weekly Budget</h3>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-foreground">$</span>
            <input
              type="number"
              min={0}
              value={profile.budget_weekly || ""}
              onChange={(e) =>
                setProfile((prev) => ({
                  ...prev,
                  budget_weekly: parseInt(e.target.value, 10) || 0,
                }))
              }
              className="w-24 px-4 py-2 border border-border rounded-lg text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <span className="text-muted-foreground">per week</span>
          </div>
        </Card>

        {/* Diet */}
        <Card className="p-6 border-2 border-primary/20">
          <h3 className="font-display font-bold text-foreground mb-4 text-lg">🥗 Diet</h3>
          <div className="flex flex-wrap gap-2">
            {dietaryOptions.map((option) => (
              <button
                key={option}
                onClick={() => toggleDiet(option)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  profile.diet === option ? "bg-primary text-white" : "bg-muted/50 text-foreground hover:bg-muted"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </Card>

        {/* Allergies */}
        <Card className="p-6 border-2 border-primary/20">
          <h3 className="font-display font-bold text-foreground mb-4 text-lg">⚠️ Allergies</h3>
          <div className="flex flex-wrap gap-2">
            {allergyOptions.map((option) => (
              <button
                key={option}
                onClick={() => toggleAllergy(option)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  (Array.isArray(profile.allergies) ? profile.allergies : []).includes(option)
                    ? "bg-destructive text-white"
                    : "bg-muted/50 text-foreground hover:bg-muted"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </Card>

        {/* Dislikes */}
        <Card className="p-6">
          <h3 className="font-bold text-foreground mb-4">Foods You Dislike</h3>
          <p className="text-sm text-muted-foreground mb-4">Mahm will never recommend recipes with these ingredients</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {(Array.isArray(profile.dislikes) ? profile.dislikes : []).map((food) => (
              <Badge
                key={food}
                className="bg-muted/50 text-foreground border-0 px-3 py-1.5 cursor-pointer hover:bg-destructive/20"
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
              className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <Button onClick={addDislikedFood} className="gradient-coral text-white">
              Add
            </Button>
          </div>
        </Card>

        {/* Max prep time */}
        <Card className="p-6">
          <h3 className="font-bold text-foreground mb-4">Max Prep Time (minutes)</h3>
          <div className="flex flex-wrap gap-2">
            {[15, 30, 45, 60].map((min) => (
              <button
                key={min}
                onClick={() => setProfile((prev) => ({ ...prev, max_prep_minutes: min }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  profile.max_prep_minutes === min ? "bg-primary text-white" : "bg-muted/50 text-foreground hover:bg-muted"
                }`}
              >
                {min} min
              </button>
            ))}
          </div>
        </Card>

        {/* Household size */}
        <Card className="p-6">
          <h3 className="font-bold text-foreground mb-4">Household Size</h3>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((size) => (
              <button
                key={size}
                onClick={() => setProfile((prev) => ({ ...prev, household_size: size }))}
                className={`w-12 h-12 rounded-lg text-sm font-medium transition-all ${
                  profile.household_size === size ? "bg-primary text-white" : "bg-muted/50 text-foreground hover:bg-muted"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </Card>

        <div className="relative">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className={`w-full font-display font-bold text-lg shadow-playful hover:scale-105 transition-transform ${
              saveSuccess ? "bg-accent hover:bg-accent text-white" : "gradient-coral text-white"
            }`}
            size="lg"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span> Saving...
              </span>
            ) : saveSuccess ? (
              <span className="flex items-center gap-2">
                <span>✓</span> Saved!
              </span>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
