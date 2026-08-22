/**
 * Send a broadcast test to a single Telegram chat.
 *
 * Exercises the real production path - upload to S3, presign the object, hand
 * the URL to sendPhoto with a caption - but talks to exactly one chat_id. The
 * /api/admin/broadcast endpoint is never called and TelegramUser is never read,
 * so this cannot reach the user list no matter what it is pointed at.
 *
 * From backend/:
 *   npm run broadcast:test -- <chatId> [imagePath] ["message"]
 *
 * Reads .env.prod at the repo root by default, because testing S3 presigning
 * requires the real bucket and a real bot token. Override with ENV_FILE.
 */
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

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

Env comes from .env.prod at the repo root. Override with ENV_FILE=../.env
Set KEEP_IMAGE=1 to leave the uploaded object in S3.
`;

function die(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

async function callTelegram(token: string, method: string, body: unknown): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as
    | { ok?: boolean; description?: string }
    | null;

  if (!res.ok || !data?.ok) {
    die(`${method} failed: HTTP ${res.status} - ${data?.description ?? "no response body"}`);
  }
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
  console.log(`bucket  ${process.env.S3_BUCKET_NAME} (${process.env.AWS_REGION})`);
  console.log(`chat    ${chatId}`);
  console.log(`text    ${message.length} chars`);

  if (!imagePath) {
    if (message.length > TELEGRAM_TEXT_MAX_CHARS) {
      die(`Message is ${message.length} characters, Telegram allows ${TELEGRAM_TEXT_MAX_CHARS}.`);
    }
    await callTelegram(token, "sendMessage", { chat_id: chatId, text: message });
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

  // Imported here rather than at the top: services/s3 builds its S3Client the
  // moment the module loads, which must happen after dotenv populates env.
  const { uploadBufferToS3, getSignedMediaUrl, deleteFromS3 } = await import("../src/services/s3");

  // Distinct prefix from real broadcasts (profiles/broadcast/media) so test
  // objects are identifiable and safe to sweep.
  const key = `profiles/broadcast-test/media/${randomUUID()}${ext}`;

  console.log(`image   ${(buffer.byteLength / 1024).toFixed(0)}KB ${contentType}`);
  await uploadBufferToS3(buffer, key, contentType);
  console.log(`upload  ok -> ${key}`);

  const imageUrl = await getSignedMediaUrl(key);
  if (!imageUrl) die("getSignedMediaUrl returned an empty string");
  console.log(`presign ok -> ${imageUrl.split("?")[0]}`);

  // Telegram downloads the URL before responding, so cleanup below is safe.
  await callTelegram(token, "sendPhoto", { chat_id: chatId, photo: imageUrl, caption: message });
  console.log(`\nsent image + caption to ${chatId}`);

  if (process.env.KEEP_IMAGE === "1") {
    console.log(`kept    ${key}`);
  } else {
    await deleteFromS3(key);
    console.log(`cleaned ${key}`);
  }
}

main().catch((err) => die(err instanceof Error ? err.message : String(err)));
