import mongoose, { Schema, Document, Types } from "mongoose";

export interface IGiftEntry {
  profileId: Types.ObjectId;
  customLink: string;
}

export interface IGiftConfig extends Document {
  entries: Types.DocumentArray<IGiftEntry>;
  enabled: boolean;
}

const GiftEntrySchema = new Schema<IGiftEntry>(
  {
    profileId: { type: Schema.Types.ObjectId, ref: "Profile", required: true },
    customLink: { type: String, default: "" },
  },
  { _id: true }
);

const GiftConfigSchema = new Schema<IGiftConfig>({
  entries: { type: [GiftEntrySchema], default: [] },
  enabled: { type: Boolean, default: true },
});

export default mongoose.model<IGiftConfig>("GiftConfig", GiftConfigSchema);
