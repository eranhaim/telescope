import mongoose, { Schema, Document } from "mongoose";

export interface IEvent extends Document {
  type: "site_open" | "profile_click" | "media_click" | "button_click";
  profileId?: string;
  s3Key?: string;
  buttonType?: string;
  buttonLabel?: string;
  linkType?: string;
  telegramUserId?: number;
  source: "telegram" | "browser";
  at: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    type: { type: String, enum: ["site_open", "profile_click", "media_click", "button_click"], required: true },
    profileId: { type: String },
    s3Key: { type: String },
    buttonType: { type: String },
    buttonLabel: { type: String },
    linkType: { type: String },
    telegramUserId: { type: Number },
    source: { type: String, enum: ["telegram", "browser"], required: true },
    at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

EventSchema.index({ type: 1, at: 1 });
EventSchema.index({ profileId: 1, at: 1 });
EventSchema.index({ telegramUserId: 1 });

export default mongoose.model<IEvent>("Event", EventSchema);
