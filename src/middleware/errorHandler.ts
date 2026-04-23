import type { NextFunction, Request, Response } from "express";
import { isAppError } from "../utils/AppError.js";
import pino from "pino";
import { ZodError } from "zod";
import { config } from "../config/index.js";

const log = pino({ level: config.NODE_ENV === "test" ? "silent" : "error" });

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (isAppError(err)) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: err.flatten(),
      },
    });
    return;
  }
  log.error({ err }, "unhandled");
  res.status(500).json({
    error: {
      code: "INTERNAL",
      message: "Internal server error",
    },
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "Not found" },
  });
}
