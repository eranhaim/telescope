/**
 * Telegram send calls for the admin broadcast.
 *
 * A broadcast reaches tens of thousands of chats, so an attached photo is
 * uploaded exactly once: Telegram answers the first multipart sendPhoto with a
 * file_id for the stored photo, and every later recipient is sent that id.
 */
const API_BASE = "https://api.telegram.org";

export interface BroadcastPhoto {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

export type SendOutcome =
  | { ok: true; messageId?: number; photoFileId?: string }
  | { ok: false; status: number; description: string };

interface TelegramReply {
  ok?: boolean;
  description?: string;
  result?: { message_id?: number; photo?: { file_id?: string }[] };
}

async function readOutcome(response: Response): Promise<SendOutcome> {
  const reply = (await response.json().catch(() => null)) as TelegramReply | null;

  if (!response.ok || !reply?.ok) {
    return {
      ok: false,
      status: response.status,
      description: reply?.description ?? "no response body",
    };
  }

  // Telegram returns one entry per size it generated; the last is the largest.
  const sizes = reply.result?.photo ?? [];
  return {
    ok: true,
    messageId: reply.result?.message_id,
    photoFileId: sizes[sizes.length - 1]?.file_id,
  };
}

export async function sendBroadcastText(
  token: string,
  chatId: number,
  text: string
): Promise<SendOutcome> {
  const response = await fetch(`${API_BASE}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  return readOutcome(response);
}

export async function sendBroadcastPhoto(
  token: string,
  chatId: number,
  caption: string,
  photo: BroadcastPhoto,
  fileId?: string
): Promise<SendOutcome> {
  const url = `${API_BASE}/bot${token}/sendPhoto`;

  if (fileId) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, photo: fileId, caption }),
    });
    return readOutcome(response);
  }

  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("caption", caption);
  // Blob rejects Node's Buffer, whose backing store may be shared.
  const bytes = new Uint8Array(photo.buffer);
  form.append("photo", new Blob([bytes], { type: photo.contentType }), photo.filename);

  // No Content-Type header: fetch has to set it so that it carries the
  // multipart boundary it generated for this form.
  const response = await fetch(url, { method: "POST", body: form });
  return readOutcome(response);
}

/**
 * True when Telegram refused the message itself rather than the recipient, so
 * it will refuse it for every other recipient too. Blocked, deleted and
 * never-started chats answer 403, or 400 "chat not found"; a transient 429 or
 * 5xx is worth moving past as well.
 */
export function isMessageRejected(outcome: { status: number; description: string }): boolean {
  return outcome.status === 400 && !/chat not found/i.test(outcome.description);
}
