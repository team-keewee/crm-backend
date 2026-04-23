import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { pinoHttp } from "pino-http";
import pino from "pino";
import { healthRouter } from "./routes/health.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { config } from "./config/index.js";
import { v1Router } from "./routes/v1/index.js";

const log = pino({ level: config.NODE_ENV === "test" ? "silent" : "info" });

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: config.NODE_ENV === "test" ? 10_000 : 300,
      standardHeaders: true,
    })
  );
  app.use(
    pinoHttp({
      logger: log,
      autoLogging: config.NODE_ENV !== "test",
    })
  );

  app.use(healthRouter);
  app.use("/api/v1", v1Router);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
