import { SupabaseClient } from "@supabase/supabase-js";

// Swappable provider interface
interface CallProvider {
  createCall(params: {
    toNumber: string;
    fromNumber: string;
    agentId: string;
    metadata: Record<string, string>;
  }): Promise<{ callId: string }>;
}

class RetellProvider implements CallProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createCall(params: {
    toNumber: string;
    fromNumber: string;
    agentId: string;
    metadata: Record<string, string>;
  }): Promise<{ callId: string }> {
    const response = await fetch("https://api.retellai.com/v2/create-phone-call", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        from_number: params.fromNumber,
        to_number: params.toNumber,
        override_agent_id: params.agentId,
        metadata: params.metadata,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Retell API error: ${error}`);
    }

    const data = await response.json();
    return { callId: data.call_id };
  }
}

export class RetellClient {
  private supabase: SupabaseClient;
  private provider: CallProvider | null = null;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  private async getConfig(): Promise<{
    enabled: boolean;
    retell_api_key: string;
    retell_agent_id: string;
    retell_from_number: string;
    stagger_delay_ms: number;
  }> {
    const { data } = await this.supabase
      .from("app_config")
      .select("value")
      .eq("key", "ai_calling")
      .single();
    return data?.value as any;
  }

  private async getProvider(): Promise<CallProvider> {
    if (!this.provider) {
      const config = await this.getConfig();
      this.provider = new RetellProvider(config.retell_api_key);
    }
    return this.provider;
  }

  async batchCall(
    driveId: string,
    volunteerIds: string[],
  ): Promise<{ initiated: number; errors: string[] }> {
    const config = await this.getConfig();
    if (!config.enabled) {
      return { initiated: 0, errors: ["AI calling is disabled"] };
    }

    const provider = await this.getProvider();
    let initiated = 0;
    const errors: string[] = [];

    // Get volunteer phone numbers
    const { data: volunteers } = await this.supabase
      .from("volunteers")
      .select("id, phone, name")
      .in("id", volunteerIds);

    if (!volunteers) {
      return { initiated: 0, errors: ["No volunteers found"] };
    }

    // Get drive info for call context
    const { data: drive } = await this.supabase
      .from("drives")
      .select("name, location_name, sunset_time")
      .eq("id", driveId)
      .single();

    for (const volunteer of volunteers) {
      try {
        const { callId } = await provider.createCall({
          toNumber: volunteer.phone,
          fromNumber: config.retell_from_number,
          agentId: config.retell_agent_id,
          metadata: {
            volunteer_id: volunteer.id,
            drive_id: driveId,
            volunteer_name: volunteer.name,
            drive_name: drive?.name || "",
            location: drive?.location_name || "",
            sunset_time: drive?.sunset_time || "",
          },
        });

        // Update communication log with call ID
        await this.supabase
          .from("communication_log")
          .update({ call_id: callId })
          .eq("volunteer_id", volunteer.id)
          .eq("drive_id", driveId)
          .eq("channel", "ai_call")
          .is("call_id", null);

        initiated++;

        // Stagger delay between calls
        await new Promise((resolve) =>
          setTimeout(resolve, config.stagger_delay_ms),
        );
      } catch (error: any) {
        errors.push(`${volunteer.name}: ${error.message}`);
      }
    }

    return { initiated, errors };
  }

  async handleWebhook(payload: any): Promise<void> {
    const callId = payload.call_id;
    if (!callId) return;

    // Find the communication log entry
    const { data: logEntry } = await this.supabase
      .from("communication_log")
      .select("id, volunteer_id, drive_id")
      .eq("call_id", callId)
      .single();

    if (!logEntry) return;

    // Parse call result from Retell webhook
    const callResult = this.classifyCallResult(payload);
    const duration = payload.call_analysis?.call_duration_seconds || 0;
    const transcript = payload.transcript || null;

    // Update communication log
    await this.supabase
      .from("communication_log")
      .update({
        call_result: callResult,
        call_duration_seconds: duration,
        call_transcript: transcript,
        response_received_at: new Date().toISOString(),
      })
      .eq("id", logEntry.id);

    // Update assignment status based on call result
    const statusMap: Record<string, string> = {
      confirmed: "confirmed",
      en_route: "en_route",
      not_coming: "cancelled",
    };

    const newStatus = statusMap[callResult];
    if (newStatus && logEntry.drive_id) {
      const updates: Record<string, any> = { status: newStatus };
      if (newStatus === "confirmed") {
        updates.confirmed_at = new Date().toISOString();
      } else if (newStatus === "cancelled") {
        updates.cancelled_at = new Date().toISOString();
        updates.cancellation_reason = "AI call - not coming";
      }

      await this.supabase
        .from("assignments")
        .update(updates)
        .eq("volunteer_id", logEntry.volunteer_id)
        .eq("drive_id", logEntry.drive_id);
    }
  }

  private classifyCallResult(
    payload: any,
  ): "confirmed" | "en_route" | "delayed" | "not_coming" | "no_answer" | "failed" {
    if (payload.call_status === "no-answer") return "no_answer";
    if (payload.call_status === "failed") return "failed";

    const summary =
      payload.call_analysis?.call_summary?.toLowerCase() || "";
    const sentiment = payload.call_analysis?.user_sentiment || "";

    if (summary.includes("on the way") || summary.includes("en route")) {
      return "en_route";
    }
    if (summary.includes("not coming") || summary.includes("cancel")) {
      return "not_coming";
    }
    if (summary.includes("late") || summary.includes("delay")) {
      return "delayed";
    }
    if (
      summary.includes("confirm") ||
      summary.includes("yes") ||
      sentiment === "Positive"
    ) {
      return "confirmed";
    }

    return "confirmed"; // Default to confirmed if unclear
  }
}
