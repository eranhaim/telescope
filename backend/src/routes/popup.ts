import { Router, Request, Response } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import PopupConfig from "../models/PopupConfig";
import { adminAuth } from "../middleware/adminAuth";
import { uploadBufferToS3, deleteFromS3, getSignedMediaUrl } from "../services/s3";
import { generateImageThumbnail } from "../services/imageThumbnail";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

async function getOrCreateConfig() {
  let config = await PopupConfig.findOne();
  if (!config) config = await PopupConfig.create({});
  return config;
}

router.get("/", async (_req: Request, res: Response) => {
  try {
    const config = await PopupConfig.findOne();
    if (!config || !config.enabled || config.photos.length === 0) {
      res.json({ enabled: false });
      return;
    }

    const randomKey = config.photos[Math.floor(Math.random() * config.photos.length)];
    const imageUrl = await getSignedMediaUrl(randomKey);

    res.json({
      enabled: true,
      imageUrl,
      buttonLabel: config.buttonLabel,
      buttonUrl: config.buttonUrl,
      idleSeconds: config.idleSeconds,
    });
  } catch (err) {
    console.error("GET /api/popup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/admin", adminAuth, async (_req: Request, res: Response) => {
  try {
    const config = await getOrCreateConfig();
    const photos = await Promise.all(
      config.photos.map(async (key, i) => ({
        key,
        url: await getSignedMediaUrl(key),
        thumbnailUrl: config.thumbnails[i] ? await getSignedMediaUrl(config.thumbnails[i]) : undefined,
      }))
    );

    res.json({
      photos,
      buttonLabel: config.buttonLabel,
      buttonUrl: config.buttonUrl,
      idleSeconds: config.idleSeconds,
      enabled: config.enabled,
    });
  } catch (err) {
    console.error("GET /api/popup/admin error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/admin", adminAuth, async (req: Request, res: Response) => {
  try {
    const { buttonLabel, buttonUrl, idleSeconds, enabled } = req.body;
    const config = await getOrCreateConfig();

    if (buttonLabel !== undefined) config.buttonLabel = buttonLabel;
    if (buttonUrl !== undefined) config.buttonUrl = buttonUrl;
    if (idleSeconds !== undefined) config.idleSeconds = idleSeconds;
    if (enabled !== undefined) config.enabled = enabled;

    await config.save();
    res.json({ success: true });
  } catch (err) {
    console.error("PUT /api/popup/admin error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/admin/upload", adminAuth, upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const ext = path.extname(req.file.originalname);
    const key = `popup/${uuidv4()}${ext}`;
    await uploadBufferToS3(req.file.buffer, key, req.file.mimetype);

    let thumbnailKey = "";
    if (req.file.mimetype.startsWith("image/")) {
      try {
        const thumbBuffer = await generateImageThumbnail(req.file.buffer);
        thumbnailKey = key.replace(/\.[^.]+$/, "_thumb.jpg");
        await uploadBufferToS3(thumbBuffer, thumbnailKey, "image/jpeg");
      } catch (err) {
        console.error("Popup thumbnail generation failed:", err);
      }
    }

    const config = await getOrCreateConfig();
    config.photos.push(key);
    config.thumbnails.push(thumbnailKey);
    await config.save();

    const url = await getSignedMediaUrl(key);
    const thumbnailUrl = thumbnailKey ? await getSignedMediaUrl(thumbnailKey) : undefined;

    res.json({ key, url, thumbnailUrl });
  } catch (err) {
    console.error("POST /api/popup/admin/upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

router.delete("/admin/photo/:key(*)", adminAuth, async (req: Request, res: Response) => {
  try {
    const key = Array.isArray(req.params.key) ? req.params.key.join("/") : req.params.key;
    const config = await getOrCreateConfig();

    const idx = config.photos.indexOf(key);
    if (idx !== -1) {
      const thumbKey = config.thumbnails[idx];
      config.photos.splice(idx, 1);
      config.thumbnails.splice(idx, 1);
      await config.save();

      await deleteFromS3(key);
      if (thumbKey) await deleteFromS3(thumbKey).catch(() => {});
    }

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/popup/admin/photo error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

export default router;
