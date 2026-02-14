"use client";

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-8 h-8 rounded-full gradient-coral flex items-center justify-center text-white text-sm font-bold">
        M
      </div>
      <div className="flex items-center gap-1.5 px-4 py-3 bg-white rounded-2xl rounded-bl-md shadow-sm">
        <span className="w-2 h-2 bg-coral rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 bg-coral rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 bg-coral rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}
