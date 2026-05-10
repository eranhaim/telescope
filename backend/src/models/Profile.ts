import mongoose, { Schema, Document } from "mongoose";

export interface IMediaItem {
  type: "image" | "video";
  s3Key: string;
  thumbnail?: string;
  order: number;
}

export interface IProfile extends Document {
  name: string;
  handle: string;
  telegramLink: string;
  profileImage: string;
  media: IMediaItem[];
  tags: string[];
  order: number;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MediaItemSchema = new Schema<IMediaItem>(
  {
    type: { type: String, enum: ["image", "video"], required: true },
    s3Key: { type: String, required: true },
    thumbnail: { type: String },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const ProfileSchema = new Schema<IProfile>(
  {
    name: { type: String, required: true },
    handle: { type: String, required: true },
    telegramLink: { type: String, required: true },
    profileImage: { type: String, default: "" },
    media: [MediaItemSchema],
    tags: [{ type: String }],
    order: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ProfileSchema.index({ tags: 1 });
ProfileSchema.index({ name: "text", handle: "text" });

export default mongoose.model<IProfile>("Profile", ProfileSchema);
