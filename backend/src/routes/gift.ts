import { Router, Request, Response } from "express";
import GiftConfig from "../models/GiftConfig";
import Profile from "../models/Profile";
import { adminAuth } from "../middleware/adminAuth";
import { signProfileUrls } from "../services/s3";

const router = Router();

async function getOrCreateConfig() {
  let config = await GiftConfig.findOne();
  if (!config) config = await GiftConfig.create({});
  return config;
}

// Public: get gift profiles
router.get("/", async (_req: Request, res: Response) => {
  try {
    const config = await GiftConfig.findOne();
    if (!config || !config.enabled || config.entries.length === 0) {
      res.json([]);
      return;
    }

    const profileIds = config.entries.map((e) => e.profileId);
    const profiles = await Profile.find({ _id: { $in: profileIds } }).lean();
    const signed = await Promise.all(profiles.map((p) => signProfileUrls(p)));

    const result = config.entries.map((entry) => {
      const profile = signed.find((p) => p._id.toString() === entry.profileId.toString());
      if (!profile) return null;
      return {
        _id: profile._id,
        name: profile.name,
        profileImageUrl: profile.profileImageUrl,
        profileImageThumbUrl: profile.profileImageThumbUrl,
        telegramLink: entry.customLink || profile.telegramLink,
      };
    }).filter(Boolean);

    res.json(result);
  } catch (err) {
    console.error("GET /api/gift error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: get config
router.get("/admin", adminAuth, async (_req: Request, res: Response) => {
  try {
    const config = await getOrCreateConfig();
    const profileIds = config.entries.map((e) => e.profileId);
    const profiles = await Profile.find({ _id: { $in: profileIds } }).lean();
    const signed = await Promise.all(profiles.map((p) => signProfileUrls(p)));

    const entries = config.entries.map((entry) => {
      const profile = signed.find((p) => p._id.toString() === entry.profileId.toString());
      return {
        profileId: entry.profileId.toString(),
        customLink: entry.customLink,
        name: profile?.name || "",
        profileImageThumbUrl: profile?.profileImageThumbUrl || profile?.profileImageUrl || "",
      };
    });

    res.json({ enabled: config.enabled, entries });
  } catch (err) {
    console.error("GET /api/gift/admin error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: save config
router.put("/admin", adminAuth, async (req: Request, res: Response) => {
  try {
    const { enabled, entries } = req.body;
    const config = await getOrCreateConfig();

    if (enabled !== undefined) config.enabled = enabled;
    if (entries !== undefined) {
      config.entries = entries.map((e: { profileId: string; customLink: string }) => ({
        profileId: e.profileId,
        customLink: e.customLink || "",
      }));
    }

    await config.save();
    res.json({ success: true });
  } catch (err) {
    console.error("PUT /api/gift/admin error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
