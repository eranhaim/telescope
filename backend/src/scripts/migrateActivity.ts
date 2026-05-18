import "dotenv/config";
import mongoose from "mongoose";
import TelegramUser from "../models/TelegramUser";
import Event from "../models/Event";

async function migrate() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/telescope";
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");

  const users = await TelegramUser.find({ "activity.0": { $exists: true } }).lean() as unknown as Array<{ telegramId: number; activity?: Array<{ type: string; profileId: string; s3Key?: string; at: Date }> }>;
  console.log(`Found ${users.length} users with activity data`);

  let totalEvents = 0;

  for (const user of users) {
    const events = (user.activity || []).map((a: { type: string; profileId: string; s3Key?: string; at: Date }) => ({
      type: a.type,
      profileId: a.profileId,
      s3Key: a.s3Key,
      telegramUserId: user.telegramId,
      source: "telegram" as const,
      at: a.at,
    }));

    if (events.length > 0) {
      await Event.insertMany(events);
      totalEvents += events.length;
    }
  }

  console.log(`Migrated ${totalEvents} events from ${users.length} users`);

  const result = await TelegramUser.updateMany({}, { $unset: { activity: "" } });
  console.log(`Cleared activity array from ${result.modifiedCount} users`);

  await mongoose.disconnect();
  console.log("Migration complete");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
