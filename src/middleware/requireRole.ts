import type { RequestHandler } from "express";
import { AppError } from "../utils/AppError.js";
import type { UserRole } from "../types/roles.js";

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError(403, "FORBIDDEN", "Insufficient permissions"));
      return;
    }
    next();
  };
}
