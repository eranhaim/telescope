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

const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Welcome to Telescope! 🔭\n\nTap the button below to explore.", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Open Telescope",
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
