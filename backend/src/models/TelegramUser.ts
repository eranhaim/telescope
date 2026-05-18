import mongoose, { Schema, Document } from "mongoose";

export interface IActivity {
  type: "profile_click" | "media_click";
  profileId: string;
  s3Key?: string;
  at: Date;
}

export interface ITelegramUser extends Document {
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  firstSeen: Date;
  lastSeen: Date;
  startCount: number;
  appOpens: number;
  activity: IActivity[];
}

const ActivitySchema = new Schema<IActivity>(
  {
    type: { type: String, enum: ["profile_click", "media_click"], required: true },
    profileId: { type: String, required: true },
    s3Key: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const TelegramUserSchema = new Schema<ITelegramUser>({
  telegramId: { type: Number, required: true, unique: true, index: true },
  firstName: { type: String, default: "" },
  lastName: { type: String },
  username: { type: String },
  languageCode: { type: String },
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
  startCount: { type: Number, default: 0 },
  appOpens: { type: Number, default: 0 },
  activity: { type: [ActivitySchema], default: [] },
});

export default mongoose.model<ITelegramUser>("TelegramUser", TelegramUserSchema);
