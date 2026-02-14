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
      {/* Fun bowl icon with colorful steam */}
      <div className={`${sizeClasses[size]} relative ${animated ? "animate-float" : ""}`}>
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Bowl body - vibrant coral/tomato */}
          <ellipse cx="32" cy="44" rx="24" ry="14" fill="#FF6B6B"/>
          <ellipse cx="32" cy="40" rx="20" ry="10" fill="#FFE8E8"/>

          {/* Bowl rim shine */}
          <path d="M14 40 Q32 34 50 40" stroke="#FF8E8E" strokeWidth="2" strokeLinecap="round"/>

          {/* Steam wisps - rainbow colors! */}
          <path
            d="M22 28 Q20 22 24 18 Q22 14 26 10"
            stroke="#51CF66"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            className={animated ? "animate-pulse-gentle" : ""}
          />
          <path
            d="M32 26 Q30 20 34 16 Q32 12 36 8"
            stroke="#FFD43B"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            className={animated ? "animate-pulse-gentle" : ""}
            style={{ animationDelay: "0.3s" }}
          />
          <path
            d="M42 28 Q40 22 44 18 Q42 14 46 10"
            stroke="#FF8ED4"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            className={animated ? "animate-pulse-gentle" : ""}
            style={{ animationDelay: "0.6s" }}
          />

          {/* Heart in the bowl */}
          <path
            d="M32 38 C32 35 28 32 26 34 C24 36 26 40 32 44 C38 40 40 36 38 34 C36 32 32 35 32 38Z"
            fill="#FF6B6B"
            className={animated ? "animate-pulse-pop" : ""}
          />

          {/* Sparkles */}
          <circle cx="18" cy="14" r="2" fill="#FFD43B" className={animated ? "animate-sparkle" : ""}/>
          <circle cx="46" cy="12" r="2" fill="#51CF66" className={animated ? "animate-sparkle" : ""} style={{ animationDelay: "0.5s" }}/>
          <circle cx="52" cy="24" r="1.5" fill="#9775FA" className={animated ? "animate-sparkle" : ""} style={{ animationDelay: "1s" }}/>
        </svg>
      </div>

      {/* Logo Text - COLORFUL */}
      {showText && (
        <div className="font-display">
          <span className={`${textSizeClasses[size]} font-bold tracking-tight`}>
            <span className="text-primary">M</span>
            <span className="text-accent">a</span>
            <span style={{ color: '#FFD43B' }}>h</span>
            <span style={{ color: '#FF8ED4' }}>m</span>
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
        {/* Simple heart bowl */}
        <div className="w-8 h-8 gradient-coral rounded-full flex items-center justify-center shadow-playful">
          <span className="text-white text-lg">♡</span>
        </div>
        {/* Little steam */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-accent text-xs animate-bounce-fun">
          ~
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
        <div className="font-display text-3xl font-bold tracking-tight">
          <span className="text-primary">M</span>
          <span className="text-accent">a</span>
          <span style={{ color: '#FFD43B' }}>h</span>
          <span style={{ color: '#FF8ED4' }}>m</span>
        </div>
        <p className="text-xs text-muted-foreground -mt-1">
          like a mom, but make it AI ✨
        </p>
      </div>
    </div>
  );
}
