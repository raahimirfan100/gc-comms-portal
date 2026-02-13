import { SupabaseClient } from "@supabase/supabase-js";
import qrcode from "qrcode-terminal";

// Rate-limited message queue
interface QueuedMessage {
  phone: string;
  message: string;
  resolve: (value: void) => void;
  reject: (reason: any) => void;
}

export class WhatsAppManager {
  private supabase: SupabaseClient;
  private sock: any = null;
  private status: string = "disconnected";
  private messageQueue: QueuedMessage[] = [];
  private processing = false;
  private rateLimit = 1000; // 1 msg/sec
  private burstLimit = 5;
  private burstCount = 0;
  private burstReset: NodeJS.Timeout | null = null;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  getStatus(): string {
    return this.status;
  }

  async connect(): Promise<void> {
    try {
      // Dynamic import for Baileys (ESM module)
      const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } =
        await import("baileys");

      const { state, saveCreds } = await useMultiFileAuthState("./auth_state");

      this.sock = makeWASocket({
        auth: state,
      });

      this.sock.ev.on("creds.update", saveCreds);

      this.sock.ev.on("connection.update", async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.status = "qr_pending";
          // Print QR in terminal for scanning
          console.log("\n📱 Scan this QR code with WhatsApp:\n");
          qrcode.generate(qr, { small: true });
          // Store QR in database for admin panel display
          await this.supabase
            .from("whatsapp_sessions")
            .upsert(
              { id: "default", status: "qr_pending", qr_code: qr },
              { onConflict: "id" },
            );
        }

        if (connection === "close") {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          this.status = "disconnected";
          await this.updateSessionStatus("disconnected");

          if (shouldReconnect) {
            console.log("Reconnecting WhatsApp...");
            setTimeout(() => this.connect(), 5000);
          }
        } else if (connection === "open") {
          this.status = "connected";
          const phoneNumber = this.sock?.user?.id?.split(":")[0] || "";
          await this.supabase
            .from("whatsapp_sessions")
            .upsert(
              {
                id: "default",
                status: "connected",
                phone_number: phoneNumber,
                qr_code: null,
              },
              { onConflict: "id" },
            );
          console.log("✅ WhatsApp connected:", phoneNumber);
        }
      });

      // Handle incoming messages for keyword detection
      this.sock.ev.on("messages.upsert", async (m: any) => {
        if (m.type !== "notify") return;
        for (const msg of m.messages) {
          if (msg.key.fromMe) continue;
          await this.handleIncomingMessage(msg);
        }
      });
    } catch (error) {
      console.error("WhatsApp connection error:", error);
      this.status = "disconnected";
      throw error;
    }
  }

  async autoReconnect(): Promise<void> {
    const { data: session } = await this.supabase
      .from("whatsapp_sessions")
      .select("status")
      .eq("id", "default")
      .single();

    if (session?.status === "connected" || session?.status === "qr_pending") {
      try {
        await this.connect();
      } catch {
        console.log("Auto-reconnect failed, will retry");
      }
    }
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.messageQueue.push({ phone, message, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.messageQueue.length === 0) return;
    this.processing = true;

    while (this.messageQueue.length > 0) {
      if (this.burstCount >= this.burstLimit) {
        await this.delay(this.rateLimit);
        this.burstCount = 0;
      }

      const item = this.messageQueue.shift()!;
      try {
        if (!this.sock) throw new Error("WhatsApp not connected");
        const jid = item.phone.replace("+", "") + "@s.whatsapp.net";
        await this.sock.sendMessage(jid, { text: item.message });
        this.burstCount++;
        item.resolve();
      } catch (error) {
        item.reject(error);
      }

      await this.delay(this.rateLimit);
    }

    this.processing = false;
  }

  async addToGroup(phone: string, groupJid: string): Promise<{ added: boolean }> {
    if (!this.sock) throw new Error("WhatsApp not connected");
    const jid = phone.replace("+", "") + "@s.whatsapp.net";
    try {
      await this.sock.groupParticipantsUpdate(groupJid, [jid], "add");
      return { added: true };
    } catch {
      return { added: false };
    }
  }

  async sendGroupMessage(groupJid: string, message: string): Promise<void> {
    if (!this.sock) throw new Error("WhatsApp not connected");
    await this.sock.sendMessage(groupJid, { text: message });
  }

  async getGroupInviteCode(groupJid: string): Promise<string | undefined> {
    if (!this.sock) throw new Error("WhatsApp not connected");
    return this.sock.groupInviteCode(groupJid);
  }

  async listGroups(): Promise<{ id: string; subject: string }[]> {
    if (!this.sock) throw new Error("WhatsApp not connected");
    const groups = await this.sock.groupFetchAllParticipating();
    return Object.values(groups).map((g: any) => ({
      id: g.id,
      subject: g.subject,
    }));
  }

  private async handleIncomingMessage(msg: any): Promise<void> {
    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      "";
    if (!text) return;

    const senderJid = msg.key.remoteJid;
    const senderPhone = "+" + senderJid.split("@")[0];

    // Get WhatsApp config for keywords
    const { data: config } = await this.supabase
      .from("app_config")
      .select("value")
      .eq("key", "whatsapp")
      .single();

    const whatsappConfig = config?.value as {
      confirm_keywords: string[];
      cancel_keywords: string[];
    } | null;

    if (!whatsappConfig) return;

    const lowerText = text.toLowerCase().trim();

    // Find volunteer by phone
    const { data: volunteer } = await this.supabase
      .from("volunteers")
      .select("id")
      .eq("phone", senderPhone)
      .single();

    if (!volunteer) return;

    // Check confirm keywords
    if (whatsappConfig.confirm_keywords.some((k) => lowerText.includes(k))) {
      await this.supabase
        .from("assignments")
        .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
        .eq("volunteer_id", volunteer.id)
        .eq("status", "assigned");

      // Log the communication
      await this.supabase.from("communication_log").insert({
        volunteer_id: volunteer.id,
        channel: "whatsapp",
        direction: "inbound",
        content: text,
        whatsapp_message_id: msg.key.id,
      });
      return;
    }

    // Check cancel keywords
    if (whatsappConfig.cancel_keywords.some((k) => lowerText.includes(k))) {
      await this.supabase
        .from("assignments")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: "WhatsApp cancel keyword",
        })
        .eq("volunteer_id", volunteer.id)
        .in("status", ["assigned", "confirmed"]);

      await this.supabase.from("communication_log").insert({
        volunteer_id: volunteer.id,
        channel: "whatsapp",
        direction: "inbound",
        content: text,
        whatsapp_message_id: msg.key.id,
      });
      return;
    }

    // Unrecognized - just log
    await this.supabase.from("communication_log").insert({
      volunteer_id: volunteer.id,
      channel: "whatsapp",
      direction: "inbound",
      content: text,
      whatsapp_message_id: msg.key.id,
    });
  }

  private async updateSessionStatus(status: string): Promise<void> {
    await this.supabase
      .from("whatsapp_sessions")
      .upsert(
        { id: "default", status, qr_code: null },
        { onConflict: "id" },
      );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
