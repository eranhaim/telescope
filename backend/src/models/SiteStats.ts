import mongoose, { Schema, Document } from "mongoose";

export interface ISiteStats extends Document {
  key: string;
  count: number;
}

const SiteStatsSchema = new Schema<ISiteStats>({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
});

export default mongoose.model<ISiteStats>("SiteStats", SiteStatsSchema);
