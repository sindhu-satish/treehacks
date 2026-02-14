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
      {/* Cute Mom Icon - A warm bowl with steam and a heart */}
      <div className={`${sizeClasses[size]} relative ${animated ? "animate-float" : ""}`}>
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Bowl body */}
          <ellipse cx="32" cy="42" rx="24" ry="14" fill="#FF5252"/>
          <ellipse cx="32" cy="38" rx="20" ry="10" fill="#FFE0E0"/>

          {/* Bowl rim shine */}
          <path d="M14 38 Q32 32 50 38" stroke="#FF80AB" strokeWidth="2" strokeLinecap="round"/>

          {/* Steam wisps */}
          <path
            d="M22 28 Q20 22 24 18 Q22 14 26 10"
            stroke="#69F0AE"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            className={animated ? "animate-pulse-gentle" : ""}
          />
          <path
            d="M32 26 Q30 20 34 16 Q32 12 36 8"
            stroke="#FFD740"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            className={animated ? "animate-pulse-gentle" : ""}
            style={{ animationDelay: "0.3s" }}
          />
          <path
            d="M42 28 Q40 22 44 18 Q42 14 46 10"
            stroke="#FF80AB"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            className={animated ? "animate-pulse-gentle" : ""}
            style={{ animationDelay: "0.6s" }}
          />

          {/* Heart in the middle */}
          <path
            d="M32 36 C32 33 28 30 26 32 C24 34 26 38 32 42 C38 38 40 34 38 32 C36 30 32 33 32 36Z"
            fill="#FF5252"
            className={animated ? "animate-sparkle" : ""}
          />

          {/* Little sparkles */}
          <circle cx="18" cy="14" r="1.5" fill="#FFD740" className={animated ? "animate-sparkle" : ""}/>
          <circle cx="46" cy="12" r="1.5" fill="#69F0AE" className={animated ? "animate-sparkle" : ""} style={{ animationDelay: "0.5s" }}/>
          <circle cx="52" cy="24" r="1" fill="#B388FF" className={animated ? "animate-sparkle" : ""} style={{ animationDelay: "1s" }}/>
        </svg>
      </div>

      {/* Logo Text */}
      {showText && (
        <div className="font-display">
          <span className={`${textSizeClasses[size]} font-bold tracking-tight`}>
            <span className="text-coral">M</span>
            <span className="text-sunny">a</span>
            <span className="text-lime">h</span>
            <span className="text-pink">m</span>
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
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-lime text-xs animate-bounce-subtle">
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
          <span className="text-coral">M</span>
          <span className="text-sunny">a</span>
          <span className="text-lime">h</span>
          <span className="text-pink">m</span>
        </div>
        <p className="text-xs text-muted-foreground -mt-1">
          like a mom, but make it AI
        </p>
      </div>
    </div>
  );
}
