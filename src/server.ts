import "dotenv/config";
import { createApp } from "./app.js";
import { connectDB } from "./db/connection.js";
import { config } from "./config/index.js";
import pino from "pino";

const log = pino({ level: config.NODE_ENV === "test" ? "silent" : "info" });

async function main() {
  await connectDB();
  const app = createApp();
  app.listen(config.PORT, () => {
    log.info(`Server listening on port ${config.PORT}`);
  });
}

main().catch((e) => {
  log.error(e, "Failed to start");
  process.exit(1);
});
