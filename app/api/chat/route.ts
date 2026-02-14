/**
 * POST /api/chat — Mahm agent endpoint.
 * Body: { messages: { role: "user" | "assistant", content: string }[] }
 * Returns: { text: string, toolCalls?: { name: string, input: unknown }[], error?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { runMahmAgent, type ChatMessage } from "@/agents/mahm-agent";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }

    const last = messages[messages.length - 1];
    if (last?.role !== "user" || typeof last?.content !== "string") {
      return NextResponse.json(
        { error: "Last message must be from user with string content" },
        { status: 400 }
      );
    }

    const result = await runMahmAgent(messages);

    return NextResponse.json({
      text: result.text,
      toolCalls: result.toolCalls,
      error: result.error,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json(
      { error: message, text: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
