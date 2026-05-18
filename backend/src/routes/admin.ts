import { Router, Request, Response } from "express";
import multer from "multer";
import ExcelJS from "exceljs";
import Profile from "../models/Profile";
import SiteStats from "../models/SiteStats";
import TelegramUser from "../models/TelegramUser";
import { adminAuth, generateAdminToken } from "../middleware/adminAuth";
import { uploadToS3, uploadBufferToS3, deleteFromS3, signProfileUrls } from "../services/s3";
import { extractVideoThumbnail } from "../services/thumbnail";
import { generateImageThumbnail } from "../services/imageThumbnail";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

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

router.get("/analytics", adminAuth, async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [profileViewsHourly, profileViewsDaily, mediaClicksDaily, profiles] = await Promise.all([
      TelegramUser.aggregate([
        { $unwind: "$activity" },
        { $match: { "activity.type": "profile_click", "activity.at": { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: {
              profileId: "$activity.profileId",
              year: { $year: "$activity.at" },
              month: { $month: "$activity.at" },
              day: { $dayOfMonth: "$activity.at" },
              hour: { $hour: "$activity.at" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1 as const, "_id.month": 1 as const, "_id.day": 1 as const, "_id.hour": 1 as const } },
      ]),
      TelegramUser.aggregate([
        { $unwind: "$activity" },
        { $match: { "activity.type": "profile_click", "activity.at": { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              profileId: "$activity.profileId",
              year: { $year: "$activity.at" },
              month: { $month: "$activity.at" },
              day: { $dayOfMonth: "$activity.at" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1 as const, "_id.month": 1 as const, "_id.day": 1 as const } },
      ]),
      TelegramUser.aggregate([
        { $unwind: "$activity" },
        { $match: { "activity.type": "media_click", "activity.at": { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              profileId: "$activity.profileId",
              year: { $year: "$activity.at" },
              month: { $month: "$activity.at" },
              day: { $dayOfMonth: "$activity.at" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1 as const, "_id.month": 1 as const, "_id.day": 1 as const } },
      ]),
      Profile.find({}, { name: 1 }).lean(),
    ]);

    const profileNames: Record<string, string> = {};
    for (const p of profiles) {
      profileNames[p._id.toString()] = p.name;
    }

    const formatHourly = (r: { _id: { profileId: string; year: number; month: number; day: number; hour: number }; count: number }) => ({
      profileId: r._id.profileId,
      time: new Date(r._id.year, r._id.month - 1, r._id.day, r._id.hour).toISOString(),
      count: r.count,
    });

    const formatDaily = (r: { _id: { profileId: string; year: number; month: number; day: number }; count: number }) => ({
      profileId: r._id.profileId,
      time: new Date(r._id.year, r._id.month - 1, r._id.day).toISOString(),
      count: r.count,
    });

    res.json({
      profileViewsHourly: profileViewsHourly.map(formatHourly),
      profileViewsDaily: profileViewsDaily.map(formatDaily),
      mediaClicksDaily: mediaClicksDaily.map(formatDaily),
      profileNames,
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
      { header: "Profile Clicks", key: "profileClicks", width: 15 },
      { header: "Media Clicks", key: "mediaClicks", width: 14 },
    ];

    sheet.getRow(1).font = { bold: true };

    for (const user of users) {
      const activity = user.activity || [];
      const profileClicks = activity.filter((a: { type: string }) => a.type === "profile_click").length;
      const mediaClicks = activity.filter((a: { type: string }) => a.type === "media_click").length;

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
        profileClicks,
        mediaClicks,
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

export default router;
