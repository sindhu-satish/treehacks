/**
 * Mahm agent — Claude Messages API + manual tool loop.
 * Supports requiredTool from LLM intent so recipe/meal requests trigger search_recipes.
 */

import Anthropic from "@anthropic-ai/sdk";
import { MAHM_SYSTEM_PROMPT } from "@/lib/mahm-system-prompt";
import { MAHM_TOOL_DEFINITIONS } from "@/lib/mahm-tool-schemas";
import { runTool, type ToolName } from "@/lib/mahm-tools";
import type { DetectedIntent } from "@/lib/intent";

const anthropic = new Anthropic();

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type RunMahmAgentOptions = {
  /** When set, system prompt is augmented so the model must use this tool (from LLM intent). */
  requiredTool?: DetectedIntent;
};

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 2048;
const MAX_TOOL_ROUNDS = 10;

type ContentBlock = Anthropic.TextBlock | Anthropic.ToolUseBlock;

const REQUIRED_TOOL_INSTRUCTIONS: Record<NonNullable<DetectedIntent>, string> = {
  search_recipes:
    "The user's message is a recipe or meal recommendation request. You MUST call the search_recipes tool first with a query and dietary_filters that match their request (e.g. vegetarian, gluten-free). Do NOT list recipe names or details in your reply—the user will see the results as cards below your message. Write only a brief intro (e.g. 'Here are some options for you!') and optionally offer to find stores or plan their week.",
  get_nutrition:
    "The user is asking about nutrition (calories, macros, etc.). You MUST call the get_nutrition tool for the food or recipe they mentioned before stating any numbers.",
  find_stores:
    "The user wants to know where to buy ingredients. You MUST call the find_stores tool with the ingredient list and their location (zip_code if known).",
  generate_meal_plan:
    "The user is asking for a meal plan (e.g. weekly plan). You MUST call the generate_meal_plan tool with their preferences and number of days.",
};

/**
 * Convert chat history to Anthropic message format.
 */
function toAnthropicMessages(messages: ChatMessage[]): Anthropic.MessageParam[] {
  return messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
}

function buildSystemPrompt(requiredTool: DetectedIntent): string {
  if (!requiredTool || !REQUIRED_TOOL_INSTRUCTIONS[requiredTool]) return MAHM_SYSTEM_PROMPT;
  return `${MAHM_SYSTEM_PROMPT}\n\n## This turn — required action\n${REQUIRED_TOOL_INSTRUCTIONS[requiredTool]}`;
}

/**
 * Run Mahm agent: multi-turn memory + manual tool loop with graceful failure.
 * When options.requiredTool is set (from LLM intent), the system prompt instructs the model to use that tool.
 */
export async function runMahmAgent(
  messages: ChatMessage[],
  options: RunMahmAgentOptions = {}
): Promise<{
  text: string;
  toolCalls: { name: string; input: unknown }[];
  recipes?: { id: string; name: string; cook_time_min?: number | null; ingredients?: string[]; dietary_tags?: string[]; image_link?: string | null }[];
  error?: string;
}> {
  const { requiredTool } = options;
  const toolCalls: { name: string; input: unknown }[] = [];
  let recipesFromSearch: { id: string; name: string; cook_time_min?: number | null; ingredients?: string[]; dietary_tags?: string[]; image_link?: string | null }[] | undefined;
  let currentMessages: Anthropic.MessageParam[] = toAnthropicMessages(messages);
  const systemPrompt = buildSystemPrompt(requiredTool ?? null);

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        tools: MAHM_TOOL_DEFINITIONS,
        messages: currentMessages,
      });

      const content = response.content as ContentBlock[];
      const stopReason = response.stop_reason;

      if (stopReason === "end_turn") {
        const textBlock = content?.find((b): b is Anthropic.TextBlock => b.type === "text");
        const text =
          textBlock?.text ??
          "I'm not sure how to respond to that. Try asking for meal ideas or where to buy ingredients.";
        return { text, toolCalls, recipes: recipesFromSearch };
      }

      if (stopReason !== "tool_use") {
        const textBlock = content?.find((b): b is Anthropic.TextBlock => b.type === "text");
        return {
          text: textBlock?.text ?? "I couldn't complete that. Please try again.",
          toolCalls,
          recipes: recipesFromSearch,
        };
      }

      const toolUseBlocks = content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );
      const toolResultBlocks: Anthropic.ToolResultBlockParam[] = [];

      for (const block of toolUseBlocks) {
        const name = block.name as ToolName;
        const input = block.input as Record<string, unknown>;
        toolCalls.push({ name, input });
        console.log("[Mahm] tool_call", { name, input: JSON.stringify(input).slice(0, 200) });
        let result: string;
        try {
          result = await runTool(name, input);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Tool failed";
          result = JSON.stringify({ error: msg, tool: name });
        }
        if (name === "search_recipes" && !result.includes('"error"')) {
          try {
            const parsed = JSON.parse(result) as unknown[];
            if (Array.isArray(parsed)) {
              recipesFromSearch = parsed.map((r) => {
                const rec = r as Record<string, unknown>;
                return {
                  id: String(rec.id ?? ""),
                  name: String(rec.name ?? rec.title ?? ""),
                  cook_time_min: typeof rec.cook_time_min === "number" ? rec.cook_time_min : null,
                  ingredients: Array.isArray(rec.ingredients) ? rec.ingredients.map(String) : [],
                  dietary_tags: Array.isArray(rec.dietary_tags) ? rec.dietary_tags.map(String) : [],
                  image_link: typeof rec.image_link === "string" ? rec.image_link : null,
                };
              });
            }
          } catch {
            // ignore parse errors
          }
        }
        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
          is_error: false,
        });
      }

      currentMessages = [
        ...currentMessages,
        { role: "assistant" as const, content },
        {
          role: "user" as const,
          content: toolResultBlocks,
        },
      ];
    }

    return {
      text: "I hit my step limit. Try asking something shorter or more specific.",
      toolCalls,
      recipes: recipesFromSearch,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      text: `I hit a snag: ${message}. Please try again in a moment.`,
      toolCalls,
      recipes: recipesFromSearch,
      error: message,
    };
  }
}

export { MAHM_SYSTEM_PROMPT };
