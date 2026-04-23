import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { User } from "../models/User.js";
import { config } from "../config/index.js";
import { AppError } from "../utils/AppError.js";
import type { UserRole } from "../types/roles.js";

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: { sub: string; role: UserRole; email: string }): string {
  const signOptions: SignOptions = {
    expiresIn: config.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, config.JWT_SECRET, signOptions);
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    "+passwordHash email name role isDisabled"
  );
  if (!user || user.isDisabled) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }
  const accessToken = signToken({
    sub: user._id.toString(),
    role: user.role,
    email: user.email,
  });
  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    },
    accessToken,
    expiresIn: config.JWT_EXPIRES_IN,
  };
}
