"use client";

import { cn } from "@/lib/utils";

interface ToolBadgeProps {
  name: string;
  status: "pending" | "complete" | "error";
}

const toolDisplayNames: Record<string, { label: string; icon: string }> = {
  search_recipes: { label: "Searching recipes", icon: "🍳" },
  get_nutrition: { label: "Checking nutrition", icon: "📊" },
  find_stores: { label: "Finding stores", icon: "🛒" },
  generate_meal_plan: { label: "Planning meals", icon: "📅" },
};

export function ToolBadge({ name, status }: ToolBadgeProps) {
  const display = toolDisplayNames[name] || { label: name, icon: "⚡" };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
        status === "pending" && "bg-sunny/30 text-charcoal animate-pulse-gentle",
        status === "complete" && "bg-lime/20 text-charcoal",
        status === "error" && "bg-destructive/20 text-destructive"
      )}
    >
      <span className={cn(status === "pending" && "animate-bounce-subtle")}>
        {display.icon}
      </span>
      <span>
        {status === "pending"
          ? `${display.label}...`
          : status === "complete"
          ? `${display.label.replace("ing", "ed").replace("Checking", "Checked").replace("Finding", "Found").replace("Planning", "Planned")}`
          : "Failed"}
      </span>
      {status === "complete" && <span className="text-lime">✓</span>}
    </span>
  );
}
