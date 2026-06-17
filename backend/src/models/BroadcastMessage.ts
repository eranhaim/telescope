import mongoose, { Schema, Document } from "mongoose";

export interface IBroadcastMessage extends Document {
  broadcastId: mongoose.Types.ObjectId;
  chatId: number;
  messageId: number;
  sentAt: Date;
}

const BroadcastMessageSchema = new Schema<IBroadcastMessage>({
  broadcastId: { type: Schema.Types.ObjectId, ref: "Broadcast", required: true, index: true },
  chatId: { type: Number, required: true },
  messageId: { type: Number, required: true },
  sentAt: { type: Date, default: Date.now, index: true },
});

export default mongoose.model<IBroadcastMessage>("BroadcastMessage", BroadcastMessageSchema);
