import mongoose, { Schema, type Document } from "mongoose";

export type AccountStatus = "prospect" | "active" | "paused" | "churned";

export interface IAddress {
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}

export interface IAccount extends Document {
  legalName: string;
  displayName: string;
  parentAccountId?: mongoose.Types.ObjectId;
  status: AccountStatus;
  healthTags: string[];
  website?: string;
  industry?: string;
  sizeBand?: string;
  timezone?: string;
  companyAddress?: IAddress;
  taxVatId?: string;
  ownerId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<IAddress>(
  {
    line1: String,
    line2: String,
    city: String,
    region: String,
    postalCode: String,
    country: String,
  },
  { _id: false }
);

const accountSchema = new Schema<IAccount>(
  {
    legalName: { type: String, required: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    parentAccountId: { type: Schema.Types.ObjectId, ref: "Account" },
    status: {
      type: String,
      enum: ["prospect", "active", "paused", "churned"],
      default: "prospect",
    },
    healthTags: [{ type: String, trim: true }],
    website: { type: String, trim: true },
    industry: { type: String, trim: true },
    sizeBand: { type: String, trim: true },
    timezone: { type: String, trim: true },
    companyAddress: addressSchema,
    taxVatId: { type: String, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

accountSchema.index({ displayName: 1 });
accountSchema.index({ status: 1 });
accountSchema.index({ ownerId: 1 });
accountSchema.index({ parentAccountId: 1 });

export const Account = mongoose.model<IAccount>("Account", accountSchema);
