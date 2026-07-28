import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPoster {
  _id: Types.ObjectId;
  name: string;
  photos: string[];
  thumbnails: string[];
  buttonLabel: string;
  buttonUrl: string;
  enabled: boolean;
}

export interface IPopupConfig extends Document {
  posters: Types.DocumentArray<IPoster>;
  idleSeconds: number;
  enabled: boolean;
}

const PosterSchema = new Schema<IPoster>(
  {
    name: { type: String, default: "" },
    photos: { type: [String], default: [] },
    thumbnails: { type: [String], default: [] },
    buttonLabel: { type: String, default: "" },
    buttonUrl: { type: String, default: "" },
    enabled: { type: Boolean, default: true },
  },
  { _id: true }
);

const PopupConfigSchema = new Schema<IPopupConfig>({
  posters: { type: [PosterSchema], default: [] },
  idleSeconds: { type: Number, default: 5 },
  enabled: { type: Boolean, default: false },
});

export default mongoose.model<IPopupConfig>("PopupConfig", PopupConfigSchema);
