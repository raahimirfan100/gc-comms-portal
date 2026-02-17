import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

  try {
    const res = await fetch(`${railwayUrl}/api/whatsapp/groups`, {
      headers: { Authorization: `Bearer ${railwaySecret}` },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach Railway service" },
      { status: 502 },
    );
  }
}
