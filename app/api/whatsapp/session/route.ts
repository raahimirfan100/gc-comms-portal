import { NextResponse } from "next/server";

// WhatsApp Cloud API does not have a persistent session or QR code flow.
// Use GET /api/whatsapp/status to check token health.
export async function GET() {
  return NextResponse.json(
    { error: "Not applicable for Cloud API — use /api/whatsapp/status instead" },
    { status: 410 },
  );
}
