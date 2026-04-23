import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { parseObjectId } from "../utils/id.js";
import { hashPassword } from "./authService.js";
import { paginationQuerySchema, skipForPage, parseSort } from "../utils/pagination.js";
import { userRoleSchema } from "../types/roles.js";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: userRoleSchema.default("standard"),
});

const updateUserSchema = z
  .object({
    name: z.string().min(1).optional(),
    role: userRoleSchema.optional(),
    isDisabled: z.boolean().optional(),
    password: z.string().min(8).optional(),
  })
  .strict();

export { createUserSchema, updateUserSchema };

export async function createUser(
  data: z.infer<typeof createUserSchema>,
  createdById: string
) {
  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing) {
    throw new AppError(409, "CONFLICT", "User with this email already exists");
  }
  const passwordHash = await hashPassword(data.password);
  const u = await User.create({
    email: data.email.toLowerCase().trim(),
    passwordHash,
    name: data.name.trim(),
    role: data.role,
    createdBy: parseObjectId(createdById, "createdBy"),
  });
  return toPublicUser(u);
}

function toPublicUser(u: { _id: unknown; email: string; name: string; role: string; isDisabled: boolean }) {
  return {
    id: String(u._id),
    email: u.email,
    name: u.name,
    role: u.role,
    isDisabled: u.isDisabled,
  };
}

export async function getUserById(id: string) {
  const u = await User.findById(id);
  if (!u) throw new AppError(404, "NOT_FOUND", "User not found");
  return toPublicUser(u);
}

export async function listUsers(query: Record<string, unknown>) {
  const p = paginationQuerySchema.parse({ ...query, sort: query.sort });
  const filter: Record<string, unknown> = {};
  const search = z.string().optional().safeParse(query.search);
  if (search.success && search.data) {
    filter.$or = [
      { name: { $regex: search.data, $options: "i" } },
      { email: { $regex: search.data, $options: "i" } },
    ];
  }
  const sort = parseSort(p.sort, ["name", "email", "createdAt"]) ?? { createdAt: -1 as const };
  const [items, total] = await Promise.all([
    User.find(filter)
      .sort(sort)
      .skip(skipForPage(p.page, p.limit))
      .limit(p.limit)
      .lean(),
    User.countDocuments(filter),
  ]);
  return {
    data: items.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      name: u.name,
      role: u.role,
      isDisabled: u.isDisabled,
    })),
    total,
    page: p.page,
    limit: p.limit,
  };
}

export async function updateUser(id: string, data: z.infer<typeof updateUserSchema>) {
  const u = await User.findById(id);
  if (!u) throw new AppError(404, "NOT_FOUND", "User not found");

  if (data.name !== undefined) u.name = data.name;
  if (data.role !== undefined) u.role = data.role;
  if (data.isDisabled !== undefined) u.isDisabled = data.isDisabled;
  if (data.password) u.passwordHash = await hashPassword(data.password);
  await u.save();
  return toPublicUser(u);
}

export async function resetUserPasswordByAdmin(id: string, newPassword: string) {
  const u = await User.findById(id);
  if (!u) throw new AppError(404, "NOT_FOUND", "User not found");
  u.passwordHash = await hashPassword(newPassword);
  await u.save();
  return toPublicUser(u);
}
