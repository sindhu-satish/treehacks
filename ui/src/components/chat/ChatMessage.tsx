"use client";

import { cn } from "@/lib/utils";
import { ChatMessage as ChatMessageType } from "@/types";
import { ToolBadge } from "./ToolBadge";

interface ChatMessageProps {
  message: ChatMessageType;
  showTimestamp?: boolean;
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function ChatMessage({ message, showTimestamp = true }: ChatMessageProps) {
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
            ? "bg-charcoal text-white"
            : "gradient-coral text-white"
        )}
      >
        {isUser ? "U" : "M"}
      </div>

      {/* Message content */}
      <div
        className={cn(
          "max-w-[75%] flex flex-col gap-1",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "px-4 py-2.5 rounded-2xl shadow-sm",
            isUser
              ? "bg-coral text-white rounded-br-sm"
              : "bg-white text-charcoal rounded-bl-sm border border-border/50"
          )}
        >
          <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
            {message.content.split('\n').map((line, i) => {
              // Handle bold text
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
