import mongoose from "mongoose";
import pino from "pino";
import { config } from "../config/index.js";

const log = pino({ level: config.NODE_ENV === "test" ? "silent" : "info" });

export async function connectDB(): Promise<void> {
  mongoose.connection.on("connected", () => log.info("MongoDB connected"));
  mongoose.connection.on("error", (err) => log.error({ err }, "MongoDB error"));
  await mongoose.connect(config.MONGODB_URI);
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}

export async function pingDB(): Promise<boolean> {
  if (mongoose.connection.readyState !== 1) return false;
  try {
    await mongoose.connection.db?.admin().ping();
    return true;
  } catch {
    return false;
  }
}
