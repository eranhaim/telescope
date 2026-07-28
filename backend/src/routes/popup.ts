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

  // Migrate legacy single-poster format to multi-poster
  const raw = config.toObject() as unknown as Record<string, unknown>;
  if (!raw.posters && raw.photos) {
    const migrated = {
      posters: [{
        name: "פוסטר 1",
        photos: (raw.photos as string[]) || [],
        thumbnails: (raw.thumbnails as string[]) || [],
        buttonLabel: (raw.buttonLabel as string) || "",
        buttonUrl: (raw.buttonUrl as string) || "",
        enabled: true,
      }],
      idleSeconds: (raw.idleSeconds as number) || 5,
      enabled: (raw.enabled as boolean) || false,
    };
    await PopupConfig.collection.replaceOne({ _id: config._id }, migrated);
    config = await PopupConfig.findById(config._id);
    if (!config) config = await PopupConfig.create({});
  }

  return config;
}

// Public endpoint: returns enabled posters, each with a random image
router.get("/", async (_req: Request, res: Response) => {
  try {
    const config = await PopupConfig.findOne();
    if (!config || !config.enabled) {
      res.json({ enabled: false });
      return;
    }

    const enabledPosters = (config.posters || []).filter(p => p.enabled && p.photos.length > 0);
    if (enabledPosters.length === 0) {
      res.json({ enabled: false });
      return;
    }

    const posters = await Promise.all(
      enabledPosters.map(async (p) => {
        const randomKey = p.photos[Math.floor(Math.random() * p.photos.length)];
        return {
          imageUrl: await getSignedMediaUrl(randomKey),
          buttonLabel: p.buttonLabel,
          buttonUrl: p.buttonUrl,
        };
      })
    );

    res.json({
      enabled: true,
      posters,
      idleSeconds: config.idleSeconds,
    });
  } catch (err) {
    console.error("GET /api/popup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: get full config
router.get("/admin", adminAuth, async (_req: Request, res: Response) => {
  try {
    const config = await getOrCreateConfig();
    const posters = await Promise.all(
      (config.posters || []).map(async (poster) => {
        const photos = await Promise.all(
          poster.photos.map(async (key, i) => ({
            key,
            url: await getSignedMediaUrl(key),
            thumbnailUrl: poster.thumbnails[i] ? await getSignedMediaUrl(poster.thumbnails[i]) : undefined,
          }))
        );
        return {
          _id: poster._id.toString(),
          name: poster.name,
          photos,
          buttonLabel: poster.buttonLabel,
          buttonUrl: poster.buttonUrl,
          enabled: poster.enabled,
        };
      })
    );

    res.json({
      posters,
      idleSeconds: config.idleSeconds,
      enabled: config.enabled,
    });
  } catch (err) {
    console.error("GET /api/popup/admin error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: update global settings
router.put("/admin", adminAuth, async (req: Request, res: Response) => {
  try {
    const { idleSeconds, enabled } = req.body;
    const config = await getOrCreateConfig();

    if (idleSeconds !== undefined) config.idleSeconds = idleSeconds;
    if (enabled !== undefined) config.enabled = enabled;

    await config.save();
    res.json({ success: true });
  } catch (err) {
    console.error("PUT /api/popup/admin error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: add a new poster
router.post("/admin/poster", adminAuth, async (req: Request, res: Response) => {
  try {
    const { name, buttonLabel, buttonUrl } = req.body;
    const config = await getOrCreateConfig();
    config.posters.push({
      name: name || `פוסטר ${config.posters.length + 1}`,
      photos: [],
      thumbnails: [],
      buttonLabel: buttonLabel || "",
      buttonUrl: buttonUrl || "",
      enabled: true,
    });
    await config.save();
    const newPoster = config.posters[config.posters.length - 1];
    res.json({
      _id: newPoster._id.toString(),
      name: newPoster.name,
      photos: [],
      buttonLabel: newPoster.buttonLabel,
      buttonUrl: newPoster.buttonUrl,
      enabled: newPoster.enabled,
    });
  } catch (err) {
    console.error("POST /api/popup/admin/poster error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: update a poster's settings
router.put("/admin/poster/:posterId", adminAuth, async (req: Request, res: Response) => {
  try {
    const { posterId } = req.params;
    const { name, buttonLabel, buttonUrl, enabled } = req.body;
    const config = await getOrCreateConfig();

    const poster = config.posters.find(p => p._id.toString() === posterId);
    if (!poster) {
      res.status(404).json({ error: "Poster not found" });
      return;
    }

    if (name !== undefined) poster.name = name;
    if (buttonLabel !== undefined) poster.buttonLabel = buttonLabel;
    if (buttonUrl !== undefined) poster.buttonUrl = buttonUrl;
    if (enabled !== undefined) poster.enabled = enabled;

    await config.save();
    res.json({ success: true });
  } catch (err) {
    console.error("PUT /api/popup/admin/poster error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: delete a poster
router.delete("/admin/poster/:posterId", adminAuth, async (req: Request, res: Response) => {
  try {
    const { posterId } = req.params;
    const config = await getOrCreateConfig();

    const posterIdx = config.posters.findIndex(p => p._id.toString() === posterId);
    if (posterIdx === -1) {
      res.status(404).json({ error: "Poster not found" });
      return;
    }
    const poster = config.posters[posterIdx];

    const keysToDelete = [...poster.photos, ...poster.thumbnails].filter(Boolean);
    await Promise.all(keysToDelete.map(k => deleteFromS3(k).catch(() => {})));

    config.posters.splice(posterIdx, 1);
    await config.save();
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/popup/admin/poster error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: upload photo to a specific poster
router.post("/admin/poster/:posterId/upload", adminAuth, upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const { posterId } = req.params;
    const config = await getOrCreateConfig();
    const poster = config.posters.find(p => p._id.toString() === posterId);
    if (!poster) {
      res.status(404).json({ error: "Poster not found" });
      return;
    }

    const ext = path.extname(req.file.originalname);
    const key = `popup/${posterId}/${uuidv4()}${ext}`;
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

    poster.photos.push(key);
    poster.thumbnails.push(thumbnailKey);
    await config.save();

    const url = await getSignedMediaUrl(key);
    const thumbnailUrl = thumbnailKey ? await getSignedMediaUrl(thumbnailKey) : undefined;

    res.json({ key, url, thumbnailUrl });
  } catch (err) {
    console.error("POST /api/popup/admin/poster/:id/upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Admin: delete a photo from a specific poster
router.delete("/admin/poster/:posterId/photo/:key(*)", adminAuth, async (req: Request, res: Response) => {
  try {
    const { posterId } = req.params;
    const key = Array.isArray(req.params.key) ? req.params.key.join("/") : req.params.key;
    const config = await getOrCreateConfig();
    const poster = config.posters.find(p => p._id.toString() === posterId);
    if (!poster) {
      res.status(404).json({ error: "Poster not found" });
      return;
    }

    const idx = poster.photos.indexOf(key);
    if (idx !== -1) {
      const thumbKey = poster.thumbnails[idx];
      poster.photos.splice(idx, 1);
      poster.thumbnails.splice(idx, 1);
      await config.save();

      await deleteFromS3(key);
      if (thumbKey) await deleteFromS3(thumbKey).catch(() => {});
    }

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/popup/admin/poster/:id/photo error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

export default router;
