import { Router, Request, Response } from "express";
import Profile from "../models/Profile";
import { MediaSection, signProfileUrls } from "../services/s3";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const { tag, search, section } = req.query;
    let query: Record<string, any> = {};

    if (tag && typeof tag === "string") {
      query.tags = tag;
    }
    if (search && typeof search === "string") {
      query.$text = { $search: search };
    }
    if (section !== undefined && section !== "post" && section !== "reel") {
      res.status(400).json({ error: "section must be post or reel" });
      return;
    }
    if (section) {
      query.media = section === "reel"
        ? { $elemMatch: { section: "reel", isPublished: { $ne: false } } }
        : { $elemMatch: { section } };
    }

    const profiles = await Profile.find(query)
      .sort({ order: 1, createdAt: -1 })
      .lean();

    const signed = await Promise.all(
      profiles.map((p) => signProfileUrls(p, { mediaSection: section as MediaSection | undefined }))
    );
    res.json(signed);
  } catch (err) {
    console.error("GET /api/profiles error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const profile = await Profile.findById(req.params.id);
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    const signed = await signProfileUrls(profile);
    res.json(signed);
  } catch (err) {
    console.error("GET /api/profiles/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
