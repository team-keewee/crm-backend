import mongoose, { Schema, type Document } from "mongoose";

export type ProjectType = "seo" | "paid" | "creative" | "content" | "web" | "other";
export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";

export interface IProject extends Document {
  accountId: mongoose.Types.ObjectId;
  engagementId?: mongoose.Types.ObjectId;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  startDate?: Date;
  targetEndDate?: Date;
  ownerId?: mongoose.Types.ObjectId;
  memberIds: mongoose.Types.ObjectId[];
  serviceCatalogItemId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    engagementId: { type: Schema.Types.ObjectId, ref: "Engagement" },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["seo", "paid", "creative", "content", "web", "other"],
      default: "other",
    },
    status: {
      type: String,
      enum: ["planning", "active", "on_hold", "completed", "cancelled"],
      default: "planning",
    },
    startDate: Date,
    targetEndDate: Date,
    ownerId: { type: Schema.Types.ObjectId, ref: "User" },
    memberIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    serviceCatalogItemId: { type: Schema.Types.ObjectId, ref: "ServiceCatalogItem" },
  },
  { timestamps: true }
);

projectSchema.index({ accountId: 1, status: 1 });
projectSchema.index({ ownerId: 1 });

export const Project = mongoose.model<IProject>("Project", projectSchema);
