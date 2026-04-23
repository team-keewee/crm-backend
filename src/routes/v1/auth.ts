import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../../middleware/validateBody.js";
import { authMiddleware } from "../../middleware/auth.js";
import { loginUser } from "../../services/authService.js";
import { User } from "../../models/User.js";
import { AppError } from "../../utils/AppError.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRouter = Router();

authRouter.post("/auth/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.validatedBody as z.infer<typeof loginSchema>;
    const result = await loginUser(email, password);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

authRouter.get("/auth/me", authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      next(new AppError(401, "UNAUTHORIZED", "Not authenticated"));
      return;
    }
    const u = await User.findById(req.user.id);
    if (!u || u.isDisabled) {
      next(new AppError(401, "UNAUTHORIZED", "User not found or disabled"));
      return;
    }
    res.json({
      user: {
        id: u._id.toString(),
        email: u.email,
        name: u.name,
        role: u.role,
      },
    });
  } catch (e) {
    next(e);
  }
});
