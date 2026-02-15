"use client";

import { useState, useEffect } from "react";

const cookingVerbs = [
  { verb: "Simmering", emoji: "🍲" },
  { verb: "Whisking up", emoji: "🥄" },
  { verb: "Taste-testing", emoji: "👩‍🍳" },
  { verb: "Marinating", emoji: "🥘" },
  { verb: "Seasoning", emoji: "🧂" },
  { verb: "Stirring up", emoji: "🥣" },
  { verb: "Prepping", emoji: "🔪" },
  { verb: "Plating", emoji: "🍽️" },
  { verb: "Garnishing", emoji: "🌿" },
  { verb: "Savoring", emoji: "😋" },
  { verb: "Cooking up", emoji: "🍳" },
  { verb: "Braising", emoji: "🫕" },
];

export function TypingIndicator() {
  const [currentVerb, setCurrentVerb] = useState(cookingVerbs[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVerb(cookingVerbs[Math.floor(Math.random() * cookingVerbs.length)]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-8 h-8 rounded-full gradient-coral flex items-center justify-center text-white text-sm font-bold">
        M
      </div>
      <div className="flex items-center gap-2 px-4 py-3 bg-white rounded-2xl rounded-bl-md shadow-sm">
        <span className="text-lg">{currentVerb.emoji}</span>
        <span className="text-sm text-muted-foreground font-medium">{currentVerb.verb} ideas...</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-coral rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 bg-coral rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 bg-coral rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </span>
      </div>
    </div>
  );
}
