import mongoose, { Schema } from "mongoose";

const ProfileRevisionSchema = new Schema(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ["create", "update", "delete"],
      required: true,
    },
    changedFields: {
      type: [String],
      default: [],
    },
    snapshot: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ProfileRevisionSchema.index({ profileId: 1, createdAt: -1 });

export default mongoose.model("ProfileRevision", ProfileRevisionSchema);
