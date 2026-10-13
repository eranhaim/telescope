/**
 * Send a broadcast test to a single Telegram chat.
 *
 * Exercises the real production send path - the same multipart sendPhoto with a
 * caption that /api/admin/broadcast uses - but talks to exactly one chat_id.
 * That endpoint is never called and TelegramUser is never read, so this cannot
 * reach the user list no matter what it is pointed at.
 *
 * From backend/:
 *   npm run broadcast:test -- <chatId> [imagePath] ["message"]
 *
 * Reads .env.prod at the repo root by default, so that the test uses the real
 * bot. Override with ENV_FILE.
 */
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import {
  sendBroadcastText,
  sendBroadcastPhoto,
  SendOutcome,
} from "../src/services/telegramBroadcast";

// Kept in sync with the guards in src/routes/admin.ts.
const TELEGRAM_TEXT_MAX_CHARS = 4096;
const TELEGRAM_CAPTION_MAX_CHARS = 1024;
const TELEGRAM_PHOTO_MAX_BYTES = 10 * 1024 * 1024;

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

const USAGE = `
Send a broadcast test to one Telegram chat.

  npm run broadcast:test -- <chatId> [imagePath] ["message"]

  chatId      your own Telegram user id - message @userinfobot to get it
  imagePath   optional; omit to test text-only
  message     optional; defaults to a timestamped string

The bot can only message you after you have sent it /start at least once.

With an imagePath you get the message twice: once with the photo uploaded, once
with it reused by file_id. Those are the two paths a real broadcast takes.

Env comes from .env.prod at the repo root. Override with ENV_FILE=../.env
`;

function die(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function expectSent(method: string, outcome: SendOutcome): SendOutcome & { ok: true } {
  if (!outcome.ok) die(`${method} failed: HTTP ${outcome.status} - ${outcome.description}`);
  return outcome;
}

async function main(): Promise<void> {
  const [chatIdArg, imagePath, messageArg] = process.argv.slice(2);
  if (!chatIdArg) {
    console.log(USAGE);
    process.exit(1);
  }

  const chatId = Number(chatIdArg);
  if (!Number.isInteger(chatId)) die(`chatId must be a whole number, got "${chatIdArg}"`);

  const envFile = process.env.ENV_FILE
    ? path.resolve(process.cwd(), process.env.ENV_FILE)
    : path.resolve(__dirname, "../../.env.prod");
  if (!fs.existsSync(envFile)) die(`env file not found: ${envFile}`);
  dotenv.config({ path: envFile });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) die(`TELEGRAM_BOT_TOKEN is empty in ${envFile}`);

  const message = messageArg || `Telescope broadcast test - ${new Date().toISOString()}`;

  console.log(`env     ${envFile}`);
  console.log(`chat    ${chatId}`);
  console.log(`text    ${message.length} chars`);

  if (!imagePath) {
    if (message.length > TELEGRAM_TEXT_MAX_CHARS) {
      die(`Message is ${message.length} characters, Telegram allows ${TELEGRAM_TEXT_MAX_CHARS}.`);
    }
    expectSent("sendMessage", await sendBroadcastText(token, chatId, message));
    console.log(`\nsent text-only to ${chatId}`);
    return;
  }

  const resolved = path.resolve(process.cwd(), imagePath);
  if (!fs.existsSync(resolved)) die(`image not found: ${resolved}`);

  const buffer = fs.readFileSync(resolved);
  const ext = path.extname(resolved).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) die(`unsupported image type "${ext}" (expected ${Object.keys(CONTENT_TYPES).join(", ")})`);

  if (buffer.byteLength > TELEGRAM_PHOTO_MAX_BYTES) {
    die(
      `Image is ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB, Telegram accepts at most ` +
        `${TELEGRAM_PHOTO_MAX_BYTES / 1024 / 1024}MB.`
    );
  }
  if (message.length > TELEGRAM_CAPTION_MAX_CHARS) {
    die(
      `Message is ${message.length} characters, Telegram allows ${TELEGRAM_CAPTION_MAX_CHARS} ` +
        `when an image is attached.`
    );
  }

  console.log(`image   ${(buffer.byteLength / 1024).toFixed(0)}KB ${contentType}`);

  const photo = { buffer, filename: `broadcast${ext}`, contentType };
  const uploaded = expectSent("sendPhoto (upload)", await sendBroadcastPhoto(token, chatId, message, photo));
  console.log(`upload  ok -> file_id ${uploaded.photoFileId ? "returned" : "MISSING"}`);
  if (!uploaded.photoFileId) die("Telegram accepted the photo but returned no file_id");

  // Recipient two onwards in a real broadcast. Sending it here is what proves
  // the 27,000 sends after the first one carry the photo too.
  expectSent("sendPhoto (file_id)", await sendBroadcastPhoto(token, chatId, message, photo, uploaded.photoFileId));

  console.log(`\nsent image + caption to ${chatId} twice: once uploaded, once by file_id`);
}

main().catch((err) => die(err instanceof Error ? err.message : String(err)));
