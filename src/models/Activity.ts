import mongoose, { Schema, type Document } from "mongoose";

export type ActivityType = "call" | "meeting" | "email" | "note" | "other";

export interface IActivity extends Document {
  type: ActivityType;
  subject: string;
  body?: string;
  occurredAt: Date;
  accountId?: mongoose.Types.ObjectId;
  dealId?: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    type: {
      type: String,
      enum: ["call", "meeting", "email", "note", "other"],
      required: true,
    },
    subject: { type: String, required: true, trim: true },
    body: { type: String, trim: true },
    occurredAt: { type: Date, required: true },
    accountId: { type: Schema.Types.ObjectId, ref: "Account" },
    dealId: { type: Schema.Types.ObjectId, ref: "Deal" },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

activitySchema.index({ accountId: 1, occurredAt: -1 });
activitySchema.index({ dealId: 1, occurredAt: -1 });
activitySchema.index({ projectId: 1, occurredAt: -1 });

export const Activity = mongoose.model<IActivity>("Activity", activitySchema);
