import mongoose, { Schema, type Document } from "mongoose";

export type EngagementModel = "retainer" | "project" | "hybrid";

/** `Document` defines `model()` on Mongoose documents; we keep the commercial `model` field name in MongoDB. */
export interface IEngagement extends Omit<Document, "model"> {
  accountId: mongoose.Types.ObjectId;
  model: EngagementModel;
  startDate?: Date;
  endDate?: Date;
  billingCadence?: string;
  indexationOrRenewalNotes?: string;
  /** SOW / MSA */
  documentName?: string;
  value?: number;
  periodLabel?: string;
  inScope?: string;
  outOfScope?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const engagementSchema = new Schema<IEngagement>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    model: {
      type: String,
      enum: ["retainer", "project", "hybrid"],
      required: true,
    },
    startDate: Date,
    endDate: Date,
    billingCadence: { type: String, trim: true },
    indexationOrRenewalNotes: { type: String, trim: true },
    documentName: { type: String, trim: true },
    value: { type: Number, min: 0 },
    periodLabel: { type: String, trim: true },
    inScope: { type: String, trim: true },
    outOfScope: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

engagementSchema.index({ accountId: 1 });
engagementSchema.index({ endDate: 1 });

export const Engagement = mongoose.model<IEngagement>("Engagement", engagementSchema);
