import mongoose, { Schema, Document } from "mongoose";

export interface IPopupConfig extends Document {
  photos: string[];
  thumbnails: string[];
  buttonLabel: string;
  buttonUrl: string;
  idleSeconds: number;
  enabled: boolean;
}

const PopupConfigSchema = new Schema<IPopupConfig>({
  photos: { type: [String], default: [] },
  thumbnails: { type: [String], default: [] },
  buttonLabel: { type: String, default: "" },
  buttonUrl: { type: String, default: "" },
  idleSeconds: { type: Number, default: 5 },
  enabled: { type: Boolean, default: false },
});

export default mongoose.model<IPopupConfig>("PopupConfig", PopupConfigSchema);
