/**
 * Mahm agent — Claude Messages API + manual tool loop.
 * Multi-turn memory, 4 tools, strict nutrition grounding, graceful tool failure.
 */

import Anthropic from "@anthropic-ai/sdk";
import { MAHM_SYSTEM_PROMPT } from "@/lib/mahm-system-prompt";
import { MAHM_TOOL_DEFINITIONS } from "@/lib/mahm-tool-schemas";
import { runTool, type ToolName } from "@/lib/mahm-tools";

const anthropic = new Anthropic();

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 2048;
const MAX_TOOL_ROUNDS = 10;

type ContentBlock = Anthropic.TextBlock | Anthropic.ToolUseBlock;

/**
 * Convert chat history to Anthropic message format.
 */
function toAnthropicMessages(messages: ChatMessage[]): Anthropic.MessageParam[] {
  return messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
}

/**
 * Run Mahm agent: multi-turn memory + manual tool loop with graceful failure.
 */
export async function runMahmAgent(messages: ChatMessage[]): Promise<{
  text: string;
  toolCalls: { name: string; input: unknown }[];
  error?: string;
}> {
  const toolCalls: { name: string; input: unknown }[] = [];
  let currentMessages: Anthropic.MessageParam[] = toAnthropicMessages(messages);

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: MAHM_SYSTEM_PROMPT,
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
        return { text, toolCalls };
      }

      if (stopReason !== "tool_use") {
        const textBlock = content?.find((b): b is Anthropic.TextBlock => b.type === "text");
        return {
          text: textBlock?.text ?? "I couldn't complete that. Please try again.",
          toolCalls,
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
        let result: string;
        try {
          result = await runTool(name, input);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Tool failed";
          result = JSON.stringify({ error: msg, tool: name });
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
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      text: `I hit a snag: ${message}. Please try again in a moment.`,
      toolCalls,
      error: message,
    };
  }
}

export { MAHM_SYSTEM_PROMPT };
