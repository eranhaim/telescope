import { Router, Request, Response } from "express";
import Profile from "../models/Profile";
import SiteStats from "../models/SiteStats";
import TelegramUser from "../models/TelegramUser";

const router = Router();

interface TelegramUserPayload {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

async function upsertTelegramUser(user: TelegramUserPayload, updates: Record<string, unknown> = {}) {
  try {
    await TelegramUser.findOneAndUpdate(
      { telegramId: user.id },
      {
        $set: {
          firstName: user.first_name || "",
          lastName: user.last_name,
          username: user.username,
          languageCode: user.language_code,
          lastSeen: new Date(),
          ...updates.$set as Record<string, unknown>,
        },
        $inc: updates.$inc as Record<string, number> || {},
        $setOnInsert: { firstSeen: new Date() },
        ...(updates.$push ? { $push: updates.$push } : {}),
      },
      { upsert: true }
    );
  } catch (err) {
    console.error("Failed to upsert TelegramUser:", err);
  }
}

router.post("/site-open", async (req: Request, res: Response) => {
  try {
    await SiteStats.findOneAndUpdate(
      { key: "site_opens" },
      { $inc: { count: 1 } },
      { upsert: true }
    );

    const telegramUser = req.body?.telegramUser as TelegramUserPayload | undefined;
    if (telegramUser?.id) {
      await upsertTelegramUser(telegramUser, { $inc: { appOpens: 1 } });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("POST /api/track/site-open error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/profile/:id", async (req: Request, res: Response) => {
  try {
    await Profile.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } });

    const telegramUserId = req.body?.telegramUserId as number | undefined;
    if (telegramUserId) {
      await TelegramUser.findOneAndUpdate(
        { telegramId: telegramUserId },
        {
          $set: { lastSeen: new Date() },
          $push: { activity: { type: "profile_click", profileId: req.params.id, at: new Date() } },
        }
      );
    }

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

    const telegramUserId = req.body?.telegramUserId as number | undefined;
    if (telegramUserId) {
      await TelegramUser.findOneAndUpdate(
        { telegramId: telegramUserId },
        {
          $set: { lastSeen: new Date() },
          $push: { activity: { type: "media_click", profileId, s3Key, at: new Date() } },
        }
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error("POST /api/track/media error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
