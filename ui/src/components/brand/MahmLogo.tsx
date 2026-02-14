"use client";

interface MahmLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  animated?: boolean;
}

export function MahmLogo({ size = "md", showText = true, animated = true }: MahmLogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  };

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-5xl",
  };

  return (
    <div className="flex items-center gap-2">
      {/* Warm bowl icon with steam */}
      <div className={`${sizeClasses[size]} relative ${animated ? "animate-float" : ""}`}>
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Bowl body - terracotta */}
          <ellipse cx="32" cy="44" rx="22" ry="12" fill="#C4704B"/>
          <ellipse cx="32" cy="40" rx="18" ry="9" fill="#F5E1D6"/>

          {/* Bowl rim highlight */}
          <path d="M16 40 Q32 35 48 40" stroke="#D4845F" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>

          {/* Steam wisps - sage green */}
          <path
            d="M24 30 Q22 24 26 20"
            stroke="#7D9B76"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            className={animated ? "animate-pulse-gentle" : ""}
          />
          <path
            d="M32 28 Q30 22 34 16"
            stroke="#8FB087"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            className={animated ? "animate-pulse-gentle" : ""}
            style={{ animationDelay: "0.4s" }}
          />
          <path
            d="M40 30 Q38 24 42 20"
            stroke="#7D9B76"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            className={animated ? "animate-pulse-gentle" : ""}
            style={{ animationDelay: "0.8s" }}
          />

          {/* Small leaf garnish */}
          <ellipse cx="32" cy="38" rx="4" ry="2" fill="#7D9B76" opacity="0.8"/>
          <path d="M32 38 L32 35" stroke="#5A7A54" strokeWidth="1" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Logo Text - warm forest green */}
      {showText && (
        <div className="font-display">
          <span className={`${textSizeClasses[size]} font-bold tracking-tight text-forest`}>
            Mahm
          </span>
        </div>
      )}
    </div>
  );
}

// Alternative minimalist logo for smaller spaces
export function MahmLogoMini({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative">
        {/* Simple warm bowl */}
        <div className="w-8 h-8 gradient-coral rounded-full flex items-center justify-center shadow-warm">
          <span className="text-warmwhite text-sm">~</span>
        </div>
      </div>
    </div>
  );
}

// Full header logo with tagline
export function MahmLogoFull({ animated = true }: { animated?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <MahmLogo size="lg" showText={false} animated={animated} />
      <div>
        <div className="font-display text-3xl font-bold tracking-tight text-forest">
          Mahm
        </div>
        <p className="text-xs text-muted-foreground -mt-1">
          your AI kitchen companion
        </p>
      </div>
    </div>
  );
}
