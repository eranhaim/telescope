import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import profilesRouter from "./routes/profiles";
import adminRouter from "./routes/admin";
import trackRouter from "./routes/track";
import popupRouter from "./routes/popup";
import BroadcastMessage from "./models/BroadcastMessage";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/profiles", profilesRouter);
app.use("/api/admin", adminRouter);
app.use("/api/track", trackRouter);
app.use("/api/popup", popupRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

const BROADCAST_TTL_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;

async function deleteStaleBroadcastMessages() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const cutoff = new Date(Date.now() - BROADCAST_TTL_MS);
  const stale = await BroadcastMessage.find({ sentAt: { $lte: cutoff } }).limit(500).lean();
  if (stale.length === 0) return;

  console.log(`Auto-deleting ${stale.length} broadcast messages older than 24h...`);
  const deletedIds: unknown[] = [];

  for (const msg of stale) {
    try {
      await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: msg.chatId, message_id: msg.messageId }),
      });
      deletedIds.push(msg._id);
    } catch {
      deletedIds.push(msg._id);
    }
    await new Promise((r) => setTimeout(r, 40));
  }

  if (deletedIds.length > 0) {
    await BroadcastMessage.deleteMany({ _id: { $in: deletedIds } });
    console.log(`Cleaned up ${deletedIds.length} broadcast message records`);
  }
}

async function start() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/telescope";
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }

  setInterval(() => {
    deleteStaleBroadcastMessages().catch((err) => console.error("Broadcast cleanup error:", err));
  }, CLEANUP_INTERVAL_MS);
  deleteStaleBroadcastMessages().catch((err) => console.error("Initial broadcast cleanup error:", err));

  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

start();
