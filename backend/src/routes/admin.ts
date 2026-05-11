import { Router, Request, Response } from "express";
import multer from "multer";
import Profile from "../models/Profile";
import { adminAuth, generateAdminToken } from "../middleware/adminAuth";
import { uploadToS3, uploadBufferToS3, deleteFromS3, signProfileUrls } from "../services/s3";
import { extractVideoThumbnail } from "../services/thumbnail";
import { generateImageThumbnail } from "../services/imageThumbnail";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.post("/login", (req: Request, res: Response) => {
  const { password } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  const token = generateAdminToken();
  res.json({ token });
});

router.post("/profiles", adminAuth, async (req: Request, res: Response) => {
  try {
    const profile = await Profile.create(req.body);
    res.status(201).json(profile);
  } catch (err) {
    console.error("POST /api/admin/profiles error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/profiles/:id", adminAuth, async (req: Request, res: Response) => {
  try {
    const profile = await Profile.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    const signed = await signProfileUrls(profile);
    res.json(signed);
  } catch (err) {
    console.error("PUT /api/admin/profiles/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/profiles/reorder", adminAuth, async (req: Request, res: Response) => {
  try {
    const { order } = req.body as { order: { id: string; order: number }[] };
    if (!Array.isArray(order)) {
      res.status(400).json({ error: "Invalid order data" });
      return;
    }
    await Promise.all(
      order.map((item) => Profile.findByIdAndUpdate(item.id, { order: item.order }))
    );
    res.json({ success: true });
  } catch (err) {
    console.error("PUT /api/admin/profiles/reorder error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/profiles/:id", adminAuth, async (req: Request, res: Response) => {
  try {
    const profile = await Profile.findById(req.params.id);
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const keysToDelete: string[] = [];
    if (profile.profileImage) keysToDelete.push(profile.profileImage);
    for (const m of profile.media) {
      keysToDelete.push(m.s3Key);
      if (m.thumbnail) keysToDelete.push(m.thumbnail);
    }
    await Promise.all(keysToDelete.map(deleteFromS3));
    await profile.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/profiles/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post(
  "/upload",
  adminAuth,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }
      const { profileId, folder } = req.body;
      const key = await uploadToS3(
        req.file,
        profileId || "temp",
        folder === "avatar" ? "avatar" : "media"
      );

      let thumbnail: string | undefined;
      if (req.file.mimetype.startsWith("video/")) {
        try {
          const thumbBuffer = await extractVideoThumbnail(req.file.buffer, req.file.originalname);
          const thumbKey = key.replace(/\.[^.]+$/, "_thumb.jpg");
          thumbnail = await uploadBufferToS3(thumbBuffer, thumbKey, "image/jpeg");
        } catch (err) {
          console.error("Video thumbnail extraction failed:", err);
        }
      } else if (req.file.mimetype.startsWith("image/")) {
        try {
          const thumbBuffer = await generateImageThumbnail(req.file.buffer);
          const thumbKey = key.replace(/\.[^.]+$/, "_thumb.jpg");
          thumbnail = await uploadBufferToS3(thumbBuffer, thumbKey, "image/jpeg");
        } catch (err) {
          console.error("Image thumbnail generation failed:", err);
        }
      }

      res.json({ key, thumbnail });
    } catch (err) {
      console.error("POST /api/admin/upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

router.delete("/media/:key(*)", adminAuth, async (req: Request, res: Response) => {
  try {
    const key = Array.isArray(req.params.key) ? req.params.key.join("/") : req.params.key;
    await deleteFromS3(key);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/media error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

export default router;
