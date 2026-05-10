import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET = process.env.S3_BUCKET_NAME || "telescope-media";

const URL_EXPIRY = 86400; // 24 hours
const CACHE_TTL = 82800_000; // 23 hours in ms (refresh before expiry)

const urlCache = new Map<string, { url: string; expiresAt: number }>();

export async function uploadToS3(
  file: Express.Multer.File,
  profileId: string,
  folder: "media" | "avatar" = "media"
): Promise<string> {
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

  const cached = urlCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const url = await getSignedUrl(s3, command, { expiresIn: URL_EXPIRY });

  urlCache.set(key, { url, expiresAt: Date.now() + CACHE_TTL });
  return url;
}

export async function signProfileUrls(profile: Record<string, any>) {
  const obj = typeof profile.toObject === "function" ? profile.toObject() : { ...profile };

  if (obj.profileImage) {
    obj.profileImageUrl = await getSignedMediaUrl(obj.profileImage);
  }
  if (obj.profileImageThumb) {
    obj.profileImageThumbUrl = await getSignedMediaUrl(obj.profileImageThumb);
  }

  if (obj.media && Array.isArray(obj.media)) {
    obj.media = await Promise.all(
      obj.media.map(async (m: any) => ({
        ...m,
        url: await getSignedMediaUrl(m.s3Key),
        thumbnailUrl: m.thumbnail ? await getSignedMediaUrl(m.thumbnail) : undefined,
      }))
    );
  }

  return obj;
}
