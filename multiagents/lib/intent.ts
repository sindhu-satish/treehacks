/**
 * LLM-based intent detection for chat messages (GPT-4o only, no regex).
 * Classifies user message so we can require the right tool (e.g. search_recipes).
 */

import OpenAI from "openai";

export type DetectedIntent =
  | "search_recipes"
  | "get_nutrition"
  | "find_stores"
  | "generate_meal_plan"
  | null;

const INTENT_LABELS = [
  "search_recipes",
  "get_nutrition",
  "find_stores",
  "generate_meal_plan",
  "none",
] as const;

const INTENT_SYSTEM = `You are an intent classifier for a kitchen/nutrition assistant (Mahm).

Given the user's message, choose exactly one intent. Reply with ONLY valid JSON in this exact shape (no other text, no markdown):
{"intent": "<label>"}

Labels:
- search_recipes — recipe ideas, meal recommendations, dinner/lunch/breakfast suggestions, "give me a recipe", "something vegetarian", "what can I cook"
- get_nutrition — calories, macros, nutrition info for a food or recipe
- find_stores — where to buy ingredients, find stores nearby, grocery
- generate_meal_plan — weekly meal plan, plan my week, multi-day plan
- none — general chat, greeting, follow-up, or unclear

Use only one of those labels as the value of "intent".`;

/**
 * Use GPT-4o to classify the user's intent. Returns which tool (if any) should be required this turn.
 * No regex: LLM returns JSON only; we parse with JSON.parse and read the intent field.
 */
export async function detectIntent(lastUserMessage: string): Promise<DetectedIntent> {
  const text = lastUserMessage.trim();
  if (!text) return null;

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.warn("[intent] OPENAI_API_KEY not set; intent detection will return null");
    return null;
  }

  try {
    const openai = new OpenAI({ apiKey: key });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 50,
      messages: [
        { role: "system", content: INTENT_SYSTEM },
        { role: "user", content: text },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { intent?: string };
    const intent = parsed?.intent;
    if (intent === "none") return null;
    if (intent && INTENT_LABELS.includes(intent as (typeof INTENT_LABELS)[number])) {
      return intent as Exclude<DetectedIntent, null>;
    }
    return null;
  } catch {
    return null;
  }
}
