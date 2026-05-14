import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;

if (!TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is required");
  process.exit(1);
}

if (!WEBAPP_URL) {
  console.error("WEBAPP_URL is required");
  process.exit(1);
}

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

const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  const locale = getLocale(msg.from?.language_code);
  const strings = botMessages[locale] || botMessages.he;

  bot.sendMessage(msg.chat.id, strings.text, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: strings.button,
            web_app: { url: WEBAPP_URL },
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
