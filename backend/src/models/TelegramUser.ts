import mongoose, { Schema, Document } from "mongoose";

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
  source?: string;
}

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
  source: { type: String },
});

export default mongoose.model<ITelegramUser>("TelegramUser", TelegramUserSchema);
