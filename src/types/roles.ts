import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "standard"]);
export type UserRole = z.infer<typeof userRoleSchema>;
