import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  sendBroadcastPhoto,
  sendBroadcastText,
  isMessageRejected,
  BroadcastPhoto,
} from "../src/services/telegramBroadcast";

const TOKEN = "test-token";
const PHOTO: BroadcastPhoto = {
  buffer: Buffer.from([0xff, 0xd8, 0xff, 0x01, 0x02]),
  filename: "broadcast.jpg",
  contentType: "image/jpeg",
};

const realFetch = globalThis.fetch;

interface Call {
  url: string;
  method?: string;
  headers?: RequestInit["headers"];
  body: unknown;
}

function stubFetch(reply: unknown, status = 200): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), method: init?.method, headers: init?.headers, body: init?.body });
    return new Response(JSON.stringify(reply), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  return calls;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("sendBroadcastPhoto", () => {
  it("uploads the photo bytes as multipart and returns the file_id", async () => {
    const calls = stubFetch({
      ok: true,
      result: {
        message_id: 42,
        photo: [{ file_id: "small" }, { file_id: "largest" }],
      },
    });

    const outcome = await sendBroadcastPhoto(TOKEN, 123, "caption", PHOTO);

    assert.deepEqual(outcome, { ok: true, messageId: 42, photoFileId: "largest" });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `https://api.telegram.org/bot${TOKEN}/sendPhoto`);

    // Multipart, with no hand-set Content-Type that would lose the boundary.
    const form = calls[0].body;
    assert.ok(form instanceof FormData);
    assert.equal(calls[0].headers, undefined);
    assert.equal(form.get("chat_id"), "123");
    assert.equal(form.get("caption"), "caption");

    const sent = form.get("photo");
    assert.ok(sent instanceof Blob);
    assert.equal(sent.type, "image/jpeg");
    assert.deepEqual(Buffer.from(await sent.arrayBuffer()), PHOTO.buffer);
  });

  it("reuses a known file_id instead of uploading the bytes again", async () => {
    const calls = stubFetch({ ok: true, result: { message_id: 43, photo: [{ file_id: "largest" }] } });

    const outcome = await sendBroadcastPhoto(TOKEN, 456, "caption", PHOTO, "largest");

    assert.equal(outcome.ok, true);
    assert.equal(calls.length, 1);
    assert.deepEqual(JSON.parse(String(calls[0].body)), {
      chat_id: 456,
      photo: "largest",
      caption: "caption",
    });
  });

  it("reports a refused recipient without throwing", async () => {
    stubFetch({ ok: false, description: "Forbidden: bot was blocked by the user" }, 403);

    const outcome = await sendBroadcastPhoto(TOKEN, 789, "caption", PHOTO);

    assert.deepEqual(outcome, {
      ok: false,
      status: 403,
      description: "Forbidden: bot was blocked by the user",
    });
  });
});

describe("sendBroadcastText", () => {
  it("posts the text as JSON and carries no photo file_id back", async () => {
    const calls = stubFetch({ ok: true, result: { message_id: 7 } });

    const outcome = await sendBroadcastText(TOKEN, 123, "hello");

    assert.deepEqual(outcome, { ok: true, messageId: 7, photoFileId: undefined });
    assert.equal(calls[0].url, `https://api.telegram.org/bot${TOKEN}/sendMessage`);
    assert.deepEqual(JSON.parse(String(calls[0].body)), { chat_id: 123, text: "hello" });
  });
});

describe("isMessageRejected", () => {
  it("is false for failures caused by the recipient, so the broadcast continues", () => {
    assert.equal(isMessageRejected({ status: 403, description: "Forbidden: bot was blocked by the user" }), false);
    assert.equal(isMessageRejected({ status: 403, description: "Forbidden: user is deactivated" }), false);
    assert.equal(isMessageRejected({ status: 400, description: "Bad Request: chat not found" }), false);
    assert.equal(isMessageRejected({ status: 429, description: "Too Many Requests" }), false);
    assert.equal(isMessageRejected({ status: 0, description: "fetch failed" }), false);
  });

  it("is true when Telegram refused the photo itself, which would repeat for everyone", () => {
    assert.equal(isMessageRejected({ status: 400, description: "Bad Request: IMAGE_PROCESS_FAILED" }), true);
    assert.equal(isMessageRejected({ status: 400, description: "Bad Request: PHOTO_INVALID_DIMENSIONS" }), true);
  });
});
