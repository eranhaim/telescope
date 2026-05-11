import { Router, Request, Response } from "express";
import Profile from "../models/Profile";
import SiteStats from "../models/SiteStats";

const router = Router();

router.post("/site-open", async (_req: Request, res: Response) => {
  try {
    await SiteStats.findOneAndUpdate(
      { key: "site_opens" },
      { $inc: { count: 1 } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("POST /api/track/site-open error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/profile/:id", async (req: Request, res: Response) => {
  try {
    await Profile.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } });
    res.json({ success: true });
  } catch (err) {
    console.error("POST /api/track/profile error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/media/:profileId/:s3Key(*)", async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const s3Key = Array.isArray(req.params.s3Key)
      ? req.params.s3Key.join("/")
      : req.params.s3Key;
    await Profile.findOneAndUpdate(
      { _id: profileId, "media.s3Key": s3Key },
      { $inc: { "media.$.clicks": 1 } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("POST /api/track/media error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
