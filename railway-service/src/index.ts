import express from "express";
import { createClient } from "@supabase/supabase-js";
import { WhatsAppManager } from "./whatsapp/connection";
import { GoogleSheetsSync } from "./sheets/sync";
import { RetellClient } from "./calling/retell-client";
import { setupCronJobs } from "./cron/scheduler";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Supabase admin client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Auth middleware for API endpoints
function authMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token !== process.env.RAILWAY_API_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// Initialize services
const whatsapp = new WhatsAppManager(supabase);
const sheetsSync = new GoogleSheetsSync(supabase);
const retell = new RetellClient(supabase);

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    whatsapp: whatsapp.getStatus(),
    uptime: process.uptime(),
  });
});

// WhatsApp endpoints
app.post("/api/whatsapp/connect", authMiddleware, async (_req, res) => {
  try {
    await whatsapp.connect();
    res.json({ status: "connecting" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/whatsapp/send", authMiddleware, async (req, res) => {
  const { phone, message } = req.body;
  try {
    await whatsapp.sendMessage(phone, message);
    res.json({ status: "sent" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/whatsapp/group/add", authMiddleware, async (req, res) => {
  const { phone, groupJid } = req.body;
  try {
    await whatsapp.addToGroup(phone, groupJid);
    res.json({ status: "added" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Google Sheets endpoints
app.post("/api/sheets/sync", authMiddleware, async (_req, res) => {
  try {
    const result = await sheetsSync.syncAll();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// AI Calling endpoints
app.post("/api/calls/batch", authMiddleware, async (req, res) => {
  const { driveId, volunteerIds } = req.body;
  try {
    const result = await retell.batchCall(driveId, volunteerIds);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Retell webhook handler
app.post("/api/webhooks/retell", async (req, res) => {
  try {
    await retell.handleWebhook(req.body);
    res.json({ received: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Railway service running on port ${PORT}`);

  // Setup cron jobs
  setupCronJobs(supabase, whatsapp, sheetsSync, retell);

  // Auto-connect WhatsApp if configured
  whatsapp.autoReconnect();
});
