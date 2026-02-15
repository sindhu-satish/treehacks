/**
 * POST /api/chat — Mahm agent endpoint.
 * Body: { messages: { role: "user" | "assistant", content: string }[] }
 * Returns: { text: string, toolCalls?: { name: string, input: unknown }[], error?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { runMahmAgent, type ChatMessage } from "@/agents/mahm-agent";
import { detectIntent } from "@/lib/intent";

export const maxDuration = 60;

const ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:3002", "http://127.0.0.1:3000", "http://127.0.0.1:3002"];

function corsHeaders(request: NextRequest): HeadersInit {
  const origin = request.headers.get("origin") ?? "";
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return { "Access-Control-Allow-Origin": allow };
}

function jsonWithCors(request: NextRequest, data: object, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders(request) });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];

    if (messages.length === 0) {
      return jsonWithCors(request, { error: "messages array is required" }, 400);
    }

    const last = messages[messages.length - 1];
    if (last?.role !== "user" || typeof last?.content !== "string") {
      return jsonWithCors(request, { error: "Last message must be from user with string content" }, 400);
    }

    const requiredTool = await detectIntent(last.content);
    const result = await runMahmAgent(messages, { requiredTool });

    return jsonWithCors(request, {
      text: result.text,
      toolCalls: result.toolCalls,
      recipes: result.recipes,
      error: result.error,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return jsonWithCors(request, { error: message, text: "Something went wrong. Please try again." }, 500);
  }
}
