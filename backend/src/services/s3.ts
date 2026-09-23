import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const STORAGE_PROVIDER =
  process.env.STORAGE_PROVIDER === "s3-compatible" ? "s3-compatible" : "aws";
const STORAGE_ENDPOINT = STORAGE_PROVIDER === "s3-compatible"
  ? process.env.S3_ENDPOINT || process.env.VULTR_OBJECT_STORAGE_ENDPOINT
  : undefined;
const STORAGE_REGION =
  STORAGE_PROVIDER === "s3-compatible"
    ? process.env.S3_REGION ||
      process.env.VULTR_OBJECT_STORAGE_REGION ||
      process.env.AWS_REGION ||
      "us-east-1"
    : process.env.AWS_REGION || "us-east-1";
const STORAGE_ACCESS_KEY =
  STORAGE_PROVIDER === "s3-compatible"
    ? process.env.S3_ACCESS_KEY_ID ||
      process.env.VULTR_ACCESS_KEY_ID ||
      process.env.AWS_ACCESS_KEY_ID ||
      ""
    : process.env.AWS_ACCESS_KEY_ID || "";
const STORAGE_SECRET_KEY =
  STORAGE_PROVIDER === "s3-compatible"
    ? process.env.S3_SECRET_ACCESS_KEY ||
      process.env.VULTR_SECRET_ACCESS_KEY ||
      process.env.AWS_SECRET_ACCESS_KEY ||
      ""
    : process.env.AWS_SECRET_ACCESS_KEY || "";

const s3 = new S3Client({
  region: STORAGE_REGION,
  ...(STORAGE_ENDPOINT ? { endpoint: STORAGE_ENDPOINT } : {}),
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: STORAGE_ACCESS_KEY,
    secretAccessKey: STORAGE_SECRET_KEY,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME || "telescope-media-us";

// Keep public playback URLs short lived. This avoids a user opening a stale
// 24-hour link after a mobile app has been suspended, while still keeping S3
// signing off the hot path for every render.
const URL_EXPIRY = 60 * 60; // 1 hour
const CACHE_TTL = 50 * 60_000; // refresh before expiry

const urlCache = new Map<string, { url: string; expiresAt: number }>();
const objectPresenceCache = new Map<string, { exists: boolean; expiresAt: number }>();

export function getStorageConfiguration() {
  const missing: string[] = [];
  if (!STORAGE_ACCESS_KEY) missing.push("access key");
  if (!STORAGE_SECRET_KEY) missing.push("secret key");
  if (!BUCKET) missing.push("bucket");
  return { configured: missing.length === 0, provider: STORAGE_PROVIDER === "aws" ? "AWS S3" : "S3-compatible", missing };
}

function assertStorageConfigured(): void {
  const status = getStorageConfiguration();
  if (!status.configured) {
    throw new Error(`Media storage is not configured (missing ${status.missing.join(", ")})`);
  }
}

export async function uploadToS3(
  file: Express.Multer.File,
  profileId: string,
  folder: "media" | "avatar" = "media"
): Promise<string> {
  assertStorageConfigured();
  const ext = path.extname(file.originalname);
  const key =
    folder === "avatar"
      ? `profiles/${profileId}/avatar${ext}`
      : `profiles/${profileId}/media/${uuidv4()}${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  urlCache.delete(key);
  return key;
}

export async function uploadBufferToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  assertStorageConfigured();
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  urlCache.delete(key);
  return key;
}

export async function deleteFromS3(key: string): Promise<void> {
  assertStorageConfigured();
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
  urlCache.delete(key);
}

export async function getSignedMediaUrl(key: string): Promise<string> {
  if (!key) return "";
  assertStorageConfigured();

  const cached = urlCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  const presence = objectPresenceCache.get(key);
  if (presence && presence.expiresAt > Date.now() && !presence.exists) {
    return "";
  }

  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    objectPresenceCache.set(key, { exists: true, expiresAt: Date.now() + CACHE_TTL });
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status !== 404) throw error;
    objectPresenceCache.set(key, { exists: false, expiresAt: Date.now() + CACHE_TTL });
    return "";
  }

  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const url = await getSignedUrl(s3, command, { expiresIn: URL_EXPIRY });

  urlCache.set(key, { url, expiresAt: Date.now() + CACHE_TTL });
  return url;
}

export async function signProfileUrls(profile: Record<string, any>) {
  const obj = typeof profile.toObject === "function" ? profile.toObject() : { ...profile };

  if (obj.profileImage) {
    obj.profileImageUrl = await getSignedMediaUrl(obj.profileImage).catch((error) => {
      console.error("Unable to sign profile image:", error instanceof Error ? error.message : error);
      return undefined;
    });
  }
  if (obj.profileImageThumb) {
    obj.profileImageThumbUrl = await getSignedMediaUrl(obj.profileImageThumb).catch(() => undefined);
  }

  if (obj.media && Array.isArray(obj.media)) {
    obj.media = await Promise.all(
      obj.media.map(async (m: any) => {
        const url = await getSignedMediaUrl(m.s3Key).catch(() => undefined);
        return {
          ...m,
          url,
          thumbnailUrl: m.thumbnail ? await getSignedMediaUrl(m.thumbnail).catch(() => undefined) : undefined,
          available: Boolean(url),
        };
      })
    );
  }

  return obj;
}
