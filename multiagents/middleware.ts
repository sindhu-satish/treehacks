import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Allow UI (and other dev origins) to call /api/* from the browser. */
const CORS_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3002",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3002",
];

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const allowOrigin = CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0];

  if (request.nextUrl.pathname.startsWith("/api/")) {
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": allowOrigin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
    const res = NextResponse.next();
    res.headers.set("Access-Control-Allow-Origin", allowOrigin);
    return res;
  }

  return NextResponse.next();
}
