import mongoose, { Schema, type Document } from "mongoose";
import type { UserRole } from "../types/roles.js";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: UserRole;
  isDisabled: boolean;
  name: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "standard"], required: true, default: "standard" },
    isDisabled: { type: Boolean, default: false },
    name: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", userSchema);
