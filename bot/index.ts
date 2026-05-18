import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import mongoose, { Schema } from "mongoose";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/telescope";

if (!TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is required");
  process.exit(1);
}

if (!WEBAPP_URL) {
  console.error("WEBAPP_URL is required");
  process.exit(1);
}

const TelegramUser = mongoose.model(
  "TelegramUser",
  new Schema({
    telegramId: { type: Number, required: true, unique: true, index: true },
    firstName: { type: String, default: "" },
    lastName: { type: String },
    username: { type: String },
    languageCode: { type: String },
    firstSeen: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
    startCount: { type: Number, default: 0 },
    appOpens: { type: Number, default: 0 },
    activity: { type: [Schema.Types.Mixed], default: [] },
  })
);

const botMessages: Record<string, { text: string; button: string }> = {
  he: {
    text: "תלחץ עלי כדי לראות את הבנות הכי שוות בישראל בחינם 🍑",
    button: "פתח את טלסקופ 🔭",
  },
  en: {
    text: "Click me to see the hottest girls in Israel for free 🍑",
    button: "Open Telescope 🔭",
  },
  ar: {
    text: "اضغط عليّ لمشاهدة أجمل البنات في إسرائيل مجاناً 🍑",
    button: "افتح تلسكوب 🔭",
  },
};

function getLocale(langCode?: string): string {
  if (!langCode) return "he";
  if (langCode === "ar") return "ar";
  if (langCode.startsWith("en")) return "en";
  return "he";
}

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Bot connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }

  const bot = new TelegramBot(TOKEN!, { polling: true });

  bot.onText(/\/start/, async (msg) => {
    const from = msg.from;
    const locale = getLocale(from?.language_code);
    const strings = botMessages[locale] || botMessages.he;

    if (from) {
      try {
        await TelegramUser.findOneAndUpdate(
          { telegramId: from.id },
          {
            $set: {
              firstName: from.first_name || "",
              lastName: from.last_name,
              username: from.username,
              languageCode: from.language_code,
              lastSeen: new Date(),
            },
            $inc: { startCount: 1 },
            $setOnInsert: { firstSeen: new Date() },
          },
          { upsert: true }
        );
      } catch (err) {
        console.error("Failed to upsert TelegramUser:", err);
      }
    }

    bot.sendMessage(msg.chat.id, strings.text, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: strings.button,
              web_app: { url: WEBAPP_URL! },
            },
          ],
        ],
      },
    });
  });

  bot.on("polling_error", (err) => {
    console.error("Polling error:", err.message);
  });

  console.log("Telescope bot is running...");
}

start();
