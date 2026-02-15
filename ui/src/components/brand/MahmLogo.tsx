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
      {/* Hand-drawn cute mom face with wooden spoon */}
      <div className={`${sizeClasses[size]} relative ${animated ? "animate-float" : ""}`}>
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Hair buns */}
          <circle cx="14" cy="28" r="8" fill="#2D3436"/>
          <circle cx="50" cy="28" r="8" fill="#2D3436"/>

          {/* Face */}
          <ellipse cx="32" cy="38" rx="18" ry="16" fill="#FFF8E7" stroke="#2D3436" strokeWidth="2.5"/>

          {/* Hair on top */}
          <path
            d="M14 32 Q14 18 32 18 Q50 18 50 32"
            fill="#2D3436"
          />

          {/* Rosy cheeks */}
          <circle cx="20" cy="42" r="4" fill="#E54B3C" opacity="0.3"/>
          <circle cx="44" cy="42" r="4" fill="#E54B3C" opacity="0.3"/>

          {/* Eyes - happy closed eyes */}
          <path
            d="M24 38 Q26 35 28 38"
            stroke="#2D3436"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M36 38 Q38 35 40 38"
            stroke="#2D3436"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />

          {/* Cute smile */}
          <path
            d="M26 46 Q32 52 38 46"
            stroke="#2D3436"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />

          {/* Wooden spoon */}
          <ellipse cx="56" cy="14" rx="6" ry="8" fill="#DEB887" stroke="#2D3436" strokeWidth="2"/>
          <rect x="54" y="20" width="4" height="20" rx="2" fill="#C4A574" stroke="#2D3436" strokeWidth="1.5"/>

          {/* Little heart on spoon */}
          <path
            d="M56 12 C56 12 54.5 11 53.5 12 C52.5 13 53.5 14 56 16 C58.5 14 59.5 13 58.5 12 C57.5 11 56 12 56 12Z"
            fill="#E54B3C"
            className={animated ? "animate-pulse-pop" : ""}
          />
        </svg>
      </div>

      {/* Logo Text - Clean, single color */}
      {showText && (
        <div className="font-display">
          <span className={`${textSizeClasses[size]} font-bold tracking-tight text-foreground`}>
            mahm
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
        {/* Simple pot icon */}
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-playful border-2 border-foreground">
          <span className="text-white text-sm">🍲</span>
        </div>
        {/* Little heart */}
        <div className="absolute -top-1 -right-1 text-accent text-xs">
          ♥
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
        <div className="font-display text-3xl font-bold tracking-tight text-foreground">
          mahm
        </div>
        <p className="text-xs text-muted-foreground -mt-1">
          like a mom, but make it AI
        </p>
      </div>
    </div>
  );
}
