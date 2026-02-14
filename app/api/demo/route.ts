/**
 * GET /api/demo — Returns cached demo conversation (backup for live demo).
 */

import { NextResponse } from "next/server";
import demo from "@/data/demo-conversation.json";

export async function GET() {
  return NextResponse.json({
    messages: demo.messages,
    description: demo.description,
    tool_calls_expected: demo.tool_calls_expected,
  });
}
