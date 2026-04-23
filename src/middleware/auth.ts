import type { Request, RequestHandler, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { AppError } from "../utils/AppError.js";
import type { UserRole } from "../types/roles.js";

interface JwtPayload {
  sub: string;
  role: UserRole;
  email: string;
}

export const authMiddleware: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new AppError(401, "UNAUTHORIZED", "Missing or invalid authorization header"));
    return;
  }
  const token = header.slice("Bearer ".length).trim();
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    req.user = { id: decoded.sub, role: decoded.role, email: decoded.email };
    next();
  } catch {
    next(new AppError(401, "UNAUTHORIZED", "Invalid or expired token"));
  }
};

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
    return;
  }
  next();
}
