import mongoose, { Schema, Document } from "mongoose";

export interface IBroadcast extends Document {
  message: string;
  sent: number;
  failed: number;
  total: number;
  startedAt: Date;
  completedAt?: Date;
}

const BroadcastSchema = new Schema<IBroadcast>({
  message: { type: String, required: true },
  sent: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
});

export default mongoose.model<IBroadcast>("Broadcast", BroadcastSchema);
