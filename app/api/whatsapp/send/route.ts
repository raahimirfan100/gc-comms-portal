import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const railwayUrl = process.env.RAILWAY_SERVICE_URL;
  const railwaySecret = process.env.RAILWAY_API_SECRET;
  if (!railwayUrl || !railwaySecret) {
    return NextResponse.json(
      { error: "Railway service not configured" },
      { status: 500 },
    );
  }

  const { phone, message } = await request.json();
  if (!phone || !message) {
    return NextResponse.json(
      { error: "Phone and message are required" },
      { status: 400 },
    );
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(`${railwayUrl}/api/whatsapp/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${railwaySecret}`,
      },
      body: JSON.stringify({ phone, message }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    Sentry.captureException(err);
    if (err?.name === "AbortError") {
      return NextResponse.json(
        { error: "Request timed out — message may still be sending" },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: "Failed to reach Railway service" },
      { status: 502 },
    );
  }
}
