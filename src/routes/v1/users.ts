import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validateBody, validateQuery } from "../../middleware/validateBody.js";
import {
  createUser,
  createUserSchema,
  getUserById,
  listUsers,
  updateUser,
  updateUserSchema,
  resetUserPasswordByAdmin,
} from "../../services/userService.js";
import { paginationQuerySchema } from "../../utils/pagination.js";
import { AppError } from "../../utils/AppError.js";

const listQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8),
});

export const usersRouter = Router();

usersRouter.use(authMiddleware);

usersRouter.get(
  "/users",
  validateQuery(listQuerySchema),
  async (req, res, next) => {
    try {
      const result = await listUsers(req.validatedQuery as z.infer<typeof listQuerySchema>);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

usersRouter.get("/users/:id", async (req, res, next) => {
  try {
    const u = await getUserById(req.params.id!);
    res.json({ data: u });
  } catch (e) {
    next(e);
  }
});

usersRouter.post(
  "/users",
  requireRole("admin"),
  validateBody(createUserSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
      const u = await createUser(req.validatedBody as z.infer<typeof createUserSchema>, req.user.id);
      res.status(201).json({ data: u });
    } catch (e) {
      next(e);
    }
  }
);

usersRouter.patch(
  "/users/:id",
  requireRole("admin"),
  validateBody(updateUserSchema),
  async (req, res, next) => {
    try {
      const u = await updateUser(req.params.id!, req.validatedBody as z.infer<typeof updateUserSchema>);
      res.json({ data: u });
    } catch (e) {
      next(e);
    }
  }
);

usersRouter.post(
  "/users/:id/reset-password",
  requireRole("admin"),
  validateBody(resetPasswordSchema),
  async (req, res, next) => {
    try {
      const u = await resetUserPasswordByAdmin(
        req.params.id!,
        (req.validatedBody as z.infer<typeof resetPasswordSchema>).password
      );
      res.json({ data: u });
    } catch (e) {
      next(e);
    }
  }
);
