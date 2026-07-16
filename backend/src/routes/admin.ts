import { Router, Request, Response } from "express";
import multer from "multer";
import ExcelJS from "exceljs";
import Profile from "../models/Profile";
import SiteStats from "../models/SiteStats";
import TelegramUser from "../models/TelegramUser";
import Event from "../models/Event";
import Broadcast from "../models/Broadcast";
import BroadcastMessage from "../models/BroadcastMessage";
import { adminAuth, generateAdminToken } from "../middleware/adminAuth";
import { uploadToS3, uploadBufferToS3, deleteFromS3, signProfileUrls } from "../services/s3";
import { extractVideoThumbnail } from "../services/thumbnail";
import { generateImageThumbnail } from "../services/imageThumbnail";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

function inferLinkType(url: string): "telegram_group" | "onlyfans" | "other" {
  const lower = (url || "").toLowerCase();
  if (lower.includes("t.me") || lower.includes("telegram")) return "telegram_group";
  if (lower.includes("onlyfans")) return "onlyfans";
  return "other";
}

function normalizeTelegramLink(link: string): string {
  if (!link) return "";
  const trimmed = link.trim();
  if (trimmed.startsWith("@")) return `https://t.me/${trimmed.slice(1)}`;
  const match = trimmed.match(/(?:https?:\/\/)?t\.me\/@?([A-Za-z0-9_]+)/);
  if (match) return `https://t.me/${match[1]}`;
  if (trimmed.startsWith("http")) return trimmed;
  return `https://t.me/${trimmed}`;
}

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
    const data = { ...req.body };
    if (data.telegramLink) data.telegramLink = normalizeTelegramLink(data.telegramLink);
    if (data.linkButtons) data.linkButtons = data.linkButtons.map((btn: { url: string }) => ({ ...btn, linkType: inferLinkType(btn.url) }));
    const profile = await Profile.create(data);
    res.status(201).json(profile);
  } catch (err) {
    console.error("POST /api/admin/profiles error:", err);
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

router.put("/profiles/:id", adminAuth, async (req: Request, res: Response) => {
  try {
    const data = { ...req.body };
    if (data.telegramLink) data.telegramLink = normalizeTelegramLink(data.telegramLink);
    if (data.linkButtons) data.linkButtons = data.linkButtons.map((btn: { url: string }) => ({ ...btn, linkType: inferLinkType(btn.url) }));
    const profile = await Profile.findByIdAndUpdate(req.params.id, data, { new: true });
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

router.get("/stats", adminAuth, async (_req: Request, res: Response) => {
  try {
    const siteOpens = await SiteStats.findOne({ key: "site_opens" });
    res.json({ siteOpens: siteOpens?.count || 0 });
  } catch (err) {
    console.error("GET /api/admin/stats error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/analytics", adminAuth, async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || "daily";

    let since: Date;
    let until: Date | undefined;
    let dateTrunc: Record<string, unknown>;

    const now = new Date();

    if (req.query.from) {
      since = new Date(req.query.from as string);
    } else if (period === "monthly") {
      since = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    } else if (period === "weekly") {
      since = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
    } else {
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    if (req.query.to) {
      until = new Date(req.query.to as string);
      until.setDate(until.getDate() + 1);
    }

    if (period === "monthly") {
      dateTrunc = { year: { $year: "$at" }, month: { $month: "$at" } };
    } else if (period === "weekly") {
      dateTrunc = { year: { $isoWeekYear: "$at" }, week: { $isoWeek: "$at" } };
    } else {
      dateTrunc = { year: { $year: "$at" }, month: { $month: "$at" }, day: { $dayOfMonth: "$at" } };
    }

    const dateFilter: Record<string, unknown> = { $gte: since };
    if (until) dateFilter.$lte = until;

    const uniqueProfileAgg = (type: string, matchExtra: Record<string, unknown> = {}) => [
      { $match: { type, at: dateFilter, telegramUserId: { $ne: null }, ...matchExtra } },
      { $group: { _id: { profileId: "$profileId", telegramUserId: "$telegramUserId", ...dateTrunc } } },
      { $group: { _id: { profileId: "$_id.profileId", ...Object.fromEntries(Object.keys(dateTrunc).map(k => [k, `$_id.${k}`])) }, count: { $sum: 1 } } },
      { $sort: { ...Object.fromEntries(Object.keys(dateTrunc).map(k => [`_id.${k}`, 1 as const])) } },
    ];

    const [uniqueSiteUsers, profileEntrances, messageClicks, telegramGroupClicks, onlyfansClicks, popupClicks, profiles, usersBySource] = await Promise.all([
      Event.aggregate([
        { $match: { type: "site_open", at: dateFilter, telegramUserId: { $ne: null } } },
        { $group: { _id: { telegramUserId: "$telegramUserId", ...dateTrunc } } },
        { $group: { _id: { ...Object.fromEntries(Object.keys(dateTrunc).map(k => [k, `$_id.${k}`])) }, count: { $sum: 1 } } },
        { $sort: { ...Object.fromEntries(Object.keys(dateTrunc).map(k => [`_id.${k}`, 1 as const])) } },
      ]),
      Event.aggregate(uniqueProfileAgg("profile_click")),
      Event.aggregate(uniqueProfileAgg("button_click", { buttonType: "message" })),
      Event.aggregate(uniqueProfileAgg("button_click", { buttonType: "link_button", linkType: "telegram_group" })),
      Event.aggregate(uniqueProfileAgg("button_click", { buttonType: "link_button", linkType: "onlyfans" })),
      Event.aggregate([
        { $match: { type: "popup_click", at: dateFilter } },
        { $group: { _id: { ...dateTrunc }, count: { $sum: 1 } } },
        { $sort: { ...Object.fromEntries(Object.keys(dateTrunc).map(k => [`_id.${k}`, 1 as const])) } },
      ]),
      Profile.find({}, { name: 1 }).lean(),
      TelegramUser.aggregate([
        { $match: { firstSeen: dateFilter } },
        { $group: { _id: { $ifNull: ["$source", "direct"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const profileNames: Record<string, string> = {};
    for (const p of profiles) {
      profileNames[p._id.toString()] = p.name;
    }

    function timeFromBucket(bucket: Record<string, number>): string {
      if (period === "monthly") {
        return new Date(bucket.year, bucket.month - 1, 1).toISOString();
      } else if (period === "weekly") {
        const jan4 = new Date(bucket.year, 0, 4);
        const dayOfWeek = jan4.getDay() || 7;
        const weekStart = new Date(jan4.getTime() + ((bucket.week - 1) * 7 - (dayOfWeek - 1)) * 86400000);
        return weekStart.toISOString();
      } else {
        return new Date(bucket.year, bucket.month - 1, bucket.day).toISOString();
      }
    }

    res.json({
      uniqueSiteUsers: uniqueSiteUsers.map((r: { _id: Record<string, number>; count: number }) => ({
        time: timeFromBucket(r._id),
        count: r.count,
      })),
      profileEntrances: profileEntrances.map((r: { _id: Record<string, number | string>; count: number }) => ({
        profileId: r._id.profileId as string,
        time: timeFromBucket(r._id as Record<string, number>),
        count: r.count,
      })),
      messageClicks: messageClicks.map((r: { _id: Record<string, number | string>; count: number }) => ({
        profileId: r._id.profileId as string,
        time: timeFromBucket(r._id as Record<string, number>),
        count: r.count,
      })),
      telegramGroupClicks: telegramGroupClicks.map((r: { _id: Record<string, number | string>; count: number }) => ({
        profileId: r._id.profileId as string,
        time: timeFromBucket(r._id as Record<string, number>),
        count: r.count,
      })),
      onlyfansClicks: onlyfansClicks.map((r: { _id: Record<string, number | string>; count: number }) => ({
        profileId: r._id.profileId as string,
        time: timeFromBucket(r._id as Record<string, number>),
        count: r.count,
      })),
      popupClicks: popupClicks.map((r: { _id: Record<string, number>; count: number }) => ({
        time: timeFromBucket(r._id),
        count: r.count,
      })),
      profileNames,
      usersBySource: usersBySource.map((r: { _id: string; count: number }) => ({
        source: r._id,
        count: r.count,
      })),
    });
  } catch (err) {
    console.error("GET /api/admin/analytics error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/users/hourly", adminAuth, async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const pipeline = [
      { $match: { firstSeen: { $gte: since } } },
      {
        $group: {
          _id: {
            year: { $year: "$firstSeen" },
            month: { $month: "$firstSeen" },
            day: { $dayOfMonth: "$firstSeen" },
            hour: { $hour: "$firstSeen" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1 as const, "_id.month": 1 as const, "_id.day": 1 as const, "_id.hour": 1 as const } },
    ];

    const results = await TelegramUser.aggregate(pipeline);

    const hourly = results.map((r) => ({
      time: new Date(r._id.year, r._id.month - 1, r._id.day, r._id.hour).toISOString(),
      count: r.count,
    }));

    res.json({ hourly, totalUsers: await TelegramUser.countDocuments() });
  } catch (err) {
    console.error("GET /api/admin/users/hourly error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/users/export", adminAuth, async (_req: Request, res: Response) => {
  try {
    const users = await TelegramUser.find().sort({ lastSeen: -1 }).lean();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Telegram Users");

    sheet.columns = [
      { header: "Telegram ID", key: "telegramId", width: 15 },
      { header: "First Name", key: "firstName", width: 18 },
      { header: "Last Name", key: "lastName", width: 18 },
      { header: "Username", key: "username", width: 20 },
      { header: "Language", key: "languageCode", width: 10 },
      { header: "First Seen", key: "firstSeen", width: 22 },
      { header: "Last Seen", key: "lastSeen", width: 22 },
      { header: "/start Count", key: "startCount", width: 14 },
      { header: "App Opens", key: "appOpens", width: 12 },
      { header: "Source", key: "source", width: 15 },
      { header: "Profile Clicks", key: "profileClicks", width: 15 },
      { header: "Media Clicks", key: "mediaClicks", width: 14 },
    ];

    sheet.getRow(1).font = { bold: true };

    const eventCounts = await Event.aggregate([
      { $match: { telegramUserId: { $ne: null }, type: { $in: ["profile_click", "media_click", "button_click"] } } },
      { $group: { _id: { telegramUserId: "$telegramUserId", type: "$type" }, count: { $sum: 1 } } },
    ]);

    const countMap: Record<number, { profileClicks: number; mediaClicks: number; buttonClicks: number }> = {};
    for (const e of eventCounts) {
      const uid = e._id.telegramUserId;
      if (!countMap[uid]) countMap[uid] = { profileClicks: 0, mediaClicks: 0, buttonClicks: 0 };
      if (e._id.type === "profile_click") countMap[uid].profileClicks = e.count;
      else if (e._id.type === "media_click") countMap[uid].mediaClicks = e.count;
      else if (e._id.type === "button_click") countMap[uid].buttonClicks = e.count;
    }

    for (const user of users) {
      const counts = countMap[user.telegramId] || { profileClicks: 0, mediaClicks: 0, buttonClicks: 0 };

      sheet.addRow({
        telegramId: user.telegramId,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        username: user.username ? `@${user.username}` : "",
        languageCode: user.languageCode || "",
        firstSeen: user.firstSeen ? new Date(user.firstSeen).toISOString() : "",
        lastSeen: user.lastSeen ? new Date(user.lastSeen).toISOString() : "",
        startCount: user.startCount || 0,
        appOpens: user.appOpens || 0,
        source: (user as Record<string, unknown>).source || "direct",
        profileClicks: counts.profileClicks,
        mediaClicks: counts.mediaClicks,
      });
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=telegram_users.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("GET /api/admin/users/export error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

let broadcastStatus: { sending: boolean; sent: number; failed: number; total: number } = {
  sending: false, sent: 0, failed: 0, total: 0,
};

router.post("/broadcast", adminAuth, async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    if (broadcastStatus.sending) {
      res.status(409).json({ error: "Broadcast already in progress", ...broadcastStatus });
      return;
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      res.status(500).json({ error: "Bot token not configured" });
      return;
    }

    const users = await TelegramUser.find({}, { telegramId: 1 }).lean();
    broadcastStatus = { sending: true, sent: 0, failed: 0, total: users.length };

    const broadcast = await Broadcast.create({ message: message.trim(), total: users.length, startedAt: new Date() });
    res.json({ started: true, total: users.length });

    (async () => {
      const messageDocs: { broadcastId: unknown; chatId: number; messageId: number; sentAt: Date }[] = [];
      try {
        for (let i = 0; i < users.length; i++) {
          try {
            const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: users[i].telegramId, text: message.trim() }),
            });
            if (resp.ok) {
              broadcastStatus.sent++;
              const data = await resp.json().catch(() => null) as { result?: { message_id?: number } } | null;
              if (data?.result?.message_id) {
                messageDocs.push({
                  broadcastId: broadcast._id,
                  chatId: users[i].telegramId,
                  messageId: data.result.message_id,
                  sentAt: new Date(),
                });
              }
            } else {
              broadcastStatus.failed++;
              if (broadcastStatus.failed <= 10) {
                const body = await resp.json().catch(() => ({}));
                console.error(`Broadcast fail [${users[i].telegramId}]: ${resp.status} ${JSON.stringify(body)}`);
              }
            }
          } catch {
            broadcastStatus.failed++;
          }
          if ((i + 1) % 100 === 0) {
            broadcast.sent = broadcastStatus.sent;
            broadcast.failed = broadcastStatus.failed;
            await broadcast.save().catch((e: unknown) => console.error("Broadcast progress save error:", e));
            if (messageDocs.length > 0) {
              await BroadcastMessage.insertMany(messageDocs).catch((e: unknown) => console.error("BroadcastMessage batch save error:", e));
              messageDocs.length = 0;
            }
          }
          await new Promise((r) => setTimeout(r, 50));
        }
      } catch (err) {
        console.error("Broadcast loop error:", err);
      } finally {
        if (messageDocs.length > 0) {
          await BroadcastMessage.insertMany(messageDocs).catch((e: unknown) => console.error("BroadcastMessage final save error:", e));
        }
        console.log(`Broadcast complete: sent=${broadcastStatus.sent}, failed=${broadcastStatus.failed}, total=${broadcastStatus.total}`);
        broadcast.sent = broadcastStatus.sent;
        broadcast.failed = broadcastStatus.failed;
        broadcast.completedAt = new Date();
        await broadcast.save().catch((e: unknown) => console.error("Broadcast final save error:", e));
        broadcastStatus.sending = false;
      }
    })();
  } catch (err) {
    console.error("POST /api/admin/broadcast error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/broadcast/status", adminAuth, async (_req: Request, res: Response) => {
  res.json(broadcastStatus);
});

router.get("/broadcast/history", adminAuth, async (_req: Request, res: Response) => {
  try {
    const history = await Broadcast.find().sort({ startedAt: -1 }).limit(20).lean();
    res.json(history);
  } catch (err) {
    console.error("GET /api/admin/broadcast/history error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/broadcast/:id", adminAuth, async (req: Request, res: Response) => {
  try {
    await Broadcast.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/broadcast error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
