import mongoose, { Schema, type Document } from "mongoose";

export interface IContact extends Document {
  accountId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  roles: string[];
  isPrimary: boolean;
  doNotEmail: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    roles: [{ type: String, trim: true }],
    isPrimary: { type: Boolean, default: false },
    doNotEmail: { type: Boolean, default: false },
  },
  { timestamps: true }
);

contactSchema.index({ accountId: 1, email: 1 });
contactSchema.index(
  { accountId: 1 },
  { unique: true, partialFilterExpression: { isPrimary: true } }
);

export const Contact = mongoose.model<IContact>("Contact", contactSchema);
