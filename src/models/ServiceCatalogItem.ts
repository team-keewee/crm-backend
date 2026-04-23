import mongoose, { Schema, type Document } from "mongoose";

export interface IServiceCatalogItem extends Document {
  name: string;
  slug: string;
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceCatalogItemSchema = new Schema<IServiceCatalogItem>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

serviceCatalogItemSchema.index({ active: 1, name: 1 });

export const ServiceCatalogItem = mongoose.model<IServiceCatalogItem>(
  "ServiceCatalogItem",
  serviceCatalogItemSchema
);
