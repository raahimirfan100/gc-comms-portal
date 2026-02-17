import { NextRequest, NextResponse } from "next/server";

const hits = new Map<string, { count: number; resetAt: number }>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of hits) {
    if (now > val.resetAt) hits.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Simple in-memory rate limiter for Next.js API routes.
 * Returns a 429 response if limit is exceeded, or null if allowed.
 *
 * @param request  - NextRequest (uses x-forwarded-for or fallback)
 * @param limit    - max requests per window (default 20)
 * @param windowMs - window size in ms (default 60_000 = 1 minute)
 */
export function rateLimit(
  request: NextRequest,
  limit = 20,
  windowMs = 60_000,
): NextResponse | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();

  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;
  if (entry.count > limit) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  return null;
}
