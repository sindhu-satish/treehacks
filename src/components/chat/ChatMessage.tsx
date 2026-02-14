"use client";

import { cn } from "@/lib/utils";
import { ChatMessage as ChatMessageType } from "@/types";
import { ToolBadge } from "./ToolBadge";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
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
          "max-w-[80%] flex flex-col gap-2",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "px-4 py-3 rounded-2xl shadow-sm",
            isUser
              ? "bg-coral text-white rounded-br-md"
              : "bg-white text-charcoal rounded-bl-md"
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
          <div className="flex flex-wrap gap-2 mt-1">
            {message.toolCalls.map((tool) => (
              <ToolBadge key={tool.id} name={tool.name} status={tool.status} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
