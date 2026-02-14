"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-border bg-white/80 backdrop-blur-sm p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-3 bg-white rounded-2xl border border-border shadow-sm p-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "Tell Mahm what you're craving..."}
            disabled={disabled}
            className="flex-1 resize-none bg-transparent px-3 py-2 text-[15px] placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 min-h-[44px] max-h-[150px]"
            rows={1}
          />
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || disabled}
            className="gradient-coral text-white rounded-xl px-6 h-11 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Send
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Drop a TikTok link, ask for meal ideas, or tell Mahm about your cravings
        </p>
      </div>
    </div>
  );
}
