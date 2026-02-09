import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { batchAutoAssign } from "@/lib/assignment/auto-assign";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { driveId } = await request.json();
  if (!driveId) {
    return NextResponse.json({ error: "driveId required" }, { status: 400 });
  }

  const results = await batchAutoAssign(
    supabase as any,
    driveId,
    data.claims.email as string || "admin",
  );

  return NextResponse.json({ count: results.length, results });
}
