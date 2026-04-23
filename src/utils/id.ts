import mongoose from "mongoose";
import { AppError } from "./AppError.js";

export function parseObjectId(id: string, label = "id"): mongoose.Types.ObjectId {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, "VALIDATION_ERROR", `Invalid ${label}`);
  }
  return new mongoose.Types.ObjectId(id);
}
