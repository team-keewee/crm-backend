import mongoose, { Schema, type Document } from "mongoose";

export type DealStage = "discovery" | "proposal" | "negotiation" | "won" | "lost";

export type LeadSource = "referral" | "inbound" | "partner" | "rfp" | "upsell" | "other";

export interface IDeal extends Document {
  accountId: mongoose.Types.ObjectId;
  name: string;
  stage: DealStage;
  expectedValue: number;
  winProbability: number;
  closeDate?: Date;
  ownerId?: mongoose.Types.ObjectId;
  leadSource: LeadSource;
  lossReason?: string;
  competitorTags: string[];
  serviceCatalogItemId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const dealSchema = new Schema<IDeal>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    name: { type: String, required: true, trim: true },
    stage: {
      type: String,
      enum: ["discovery", "proposal", "negotiation", "won", "lost"],
      default: "discovery",
    },
    expectedValue: { type: Number, default: 0, min: 0 },
    winProbability: { type: Number, default: 0, min: 0, max: 100 },
    closeDate: Date,
    ownerId: { type: Schema.Types.ObjectId, ref: "User" },
    leadSource: {
      type: String,
      enum: ["referral", "inbound", "partner", "rfp", "upsell", "other"],
      default: "other",
    },
    lossReason: { type: String, trim: true },
    competitorTags: [{ type: String, trim: true }],
    serviceCatalogItemId: { type: Schema.Types.ObjectId, ref: "ServiceCatalogItem" },
  },
  { timestamps: true }
);

dealSchema.index({ accountId: 1, stage: 1 });
dealSchema.index({ ownerId: 1 });

export const Deal = mongoose.model<IDeal>("Deal", dealSchema);
