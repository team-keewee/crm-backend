import mongoose, { Schema, type Document } from "mongoose";

export type DeliverableApprovalStatus = "submitted" | "in_review" | "approved" | "rejected";

export interface IDeliverable extends Document {
  projectId: mongoose.Types.ObjectId;
  taskId?: mongoose.Types.ObjectId;
  title: string;
  dueDate?: Date;
  approvalStatus: DeliverableApprovalStatus;
  submittedBy?: mongoose.Types.ObjectId;
  reviewedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const deliverableSchema = new Schema<IDeliverable>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    taskId: { type: Schema.Types.ObjectId, ref: "Task" },
    title: { type: String, required: true, trim: true },
    dueDate: Date,
    approvalStatus: {
      type: String,
      enum: ["submitted", "in_review", "approved", "rejected"],
      default: "submitted",
    },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

deliverableSchema.index({ projectId: 1, approvalStatus: 1 });
deliverableSchema.index({ taskId: 1 });

export const Deliverable = mongoose.model<IDeliverable>("Deliverable", deliverableSchema);
