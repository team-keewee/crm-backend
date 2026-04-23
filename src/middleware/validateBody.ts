import type { Request, RequestHandler } from "express";
import type { z } from "zod";
import { AppError } from "../utils/AppError.js";

export function validateBody<T extends z.ZodTypeAny>(schema: T): RequestHandler {
  return (req, _res, next) => {
    const r = schema.safeParse(req.body);
    if (!r.success) {
      next(new AppError(400, "VALIDATION_ERROR", "Validation failed", r.error.flatten()));
      return;
    }
    (req as Request & { validatedBody: z.infer<T> }).validatedBody = r.data;
    next();
  };
}

export function validateQuery<T extends z.ZodTypeAny>(schema: T): RequestHandler {
  return (req, _res, next) => {
    const r = schema.safeParse(req.query);
    if (!r.success) {
      next(new AppError(400, "VALIDATION_ERROR", "Validation failed", r.error.flatten()));
      return;
    }
    (req as Request & { validatedQuery: z.infer<T> }).validatedQuery = r.data;
    next();
  };
}
