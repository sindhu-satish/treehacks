"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChatMessage as ChatMessageType, ChatRecipeFromApi } from "@/types";
import { ToolBadge } from "./ToolBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ChatMessageProps {
  message: ChatMessageType;
  showTimestamp?: boolean;
  onAddToCalendar?: (recipe: ChatRecipeFromApi) => void;
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function ChatMessage({ message, showTimestamp = true, onAddToCalendar }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex items-end gap-2 px-4 py-1",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-sm",
          isUser
            ? "bg-foreground text-background"
            : "gradient-coral text-white"
        )}
      >
        {isUser ? "U" : "M"}
      </div>

      {/* Message content */}
      <div
        className={cn(
          "max-w-[85%] flex flex-col gap-1",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "px-4 py-2.5 rounded-2xl shadow-sm",
            isUser
              ? "bg-primary text-white rounded-br-sm"
              : "bg-white text-foreground rounded-bl-sm border border-border/50"
          )}
        >
          <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
            {message.content.split('\n').map((line, i) => {
              const parts = line.split(/(\*\*.*?\*\*)/g);
              return (
                <p key={i} className={i > 0 ? "mt-2" : ""}>
                  {parts.map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <strong key={j}>{part.slice(2, -2)}</strong>;
                    }
                    return part;
                  })}
                </p>
              );
            })}
          </div>
        </div>

        {/* Recipe cards (from search_recipes) */}
        {!isUser && message.recipes && message.recipes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 w-full max-w-2xl">
            {message.recipes.map((recipe) => (
              <ChatRecipeCard
                key={recipe.id}
                recipe={recipe}
                onAddToCalendar={onAddToCalendar}
              />
            ))}
          </div>
        )}

        {/* Tool badges */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {message.toolCalls.map((tool) => (
              <ToolBadge key={tool.id} name={tool.name} status={tool.status} />
            ))}
          </div>
        )}

        {/* Timestamp */}
        {showTimestamp && (
          <span className={cn(
            "text-[10px] text-muted-foreground mt-0.5 px-1",
            isUser ? "text-right" : "text-left"
          )}>
            {formatTime(message.timestamp)}
          </span>
        )}
      </div>
    </div>
  );
}

function ChatRecipeCard({
  recipe,
  onAddToCalendar,
}: {
  recipe: ChatRecipeFromApi;
  onAddToCalendar?: (recipe: ChatRecipeFromApi) => void;
}) {
  const imageUrl = recipe.image_link && recipe.image_link.trim() ? recipe.image_link.trim() : null;
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = imageUrl && !imageFailed;
  return (
    <Card className="overflow-hidden border border-border/50 hover:shadow-md transition-all flex flex-col">
      <div className="aspect-[4/3] bg-muted/40 flex items-center justify-center overflow-hidden">
        {showImage ? (
          <img
            src={imageUrl}
            alt={recipe.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="text-5xl">🍳</span>
        )}
      </div>
      <div className="p-3 flex flex-col gap-2">
        <h4 className="font-bold text-foreground text-sm line-clamp-2">{recipe.name}</h4>
        <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
          {recipe.cook_time_min != null && (
            <span>⏱️ {recipe.cook_time_min} min</span>
          )}
          {recipe.dietary_tags && recipe.dietary_tags.length > 0 && (
            <span className="truncate">{recipe.dietary_tags.slice(0, 3).join(", ")}</span>
          )}
        </div>
        {onAddToCalendar && (
          <Button
            size="sm"
            variant="outline"
            className="mt-auto border-2 border-primary text-primary hover:bg-primary/10 font-bold text-xs"
            onClick={() => onAddToCalendar(recipe)}
          >
            📅 Add to meal calendar
          </Button>
        )}
      </div>
    </Card>
  );
}

// Date separator component
export function DateSeparator({ date }: { date: Date }) {
  const formatDate = (d: Date): string => {
    const today = new Date();
    const msgDate = new Date(d);

    // Check if it's today
    if (msgDate.toDateString() === today.toDateString()) {
      return "Today";
    }

    // Check if it's yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (msgDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    // Check if it's within this week
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    if (msgDate > weekAgo) {
      return msgDate.toLocaleDateString("en-US", { weekday: "long" });
    }

    // Otherwise show full date
    return msgDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex items-center justify-center py-3">
      <div className="px-3 py-1 bg-muted/50 rounded-full text-xs text-muted-foreground font-medium">
        {formatDate(date)}
      </div>
    </div>
  );
}
