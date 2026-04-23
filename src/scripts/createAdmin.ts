import "dotenv/config";
import { connectDB, disconnectDB } from "../db/connection.js";
import { User } from "../models/User.js";
import { hashPassword } from "../services/authService.js";
import pino from "pino";

const log = pino({ level: "info" });

async function main() {
  const email = process.env.CREATE_ADMIN_EMAIL;
  const password = process.env.CREATE_ADMIN_PASSWORD;
  const name = process.env.CREATE_ADMIN_NAME ?? "Admin";

  if (!email || !password) {
    log.error("Set CREATE_ADMIN_EMAIL and CREATE_ADMIN_PASSWORD in the environment");
    process.exit(1);
  }

  await connectDB();
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    log.info("User already exists, exiting");
    await disconnectDB();
    process.exit(0);
  }

  const passwordHash = await hashPassword(password);
  await User.create({
    email: email.toLowerCase().trim(),
    passwordHash,
    name: name.trim(),
    role: "admin",
  });
  log.info({ email }, "Admin user created");
  await disconnectDB();
}

main().catch((e) => {
  log.error(e);
  process.exit(1);
});
