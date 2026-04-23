import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validateBody, validateQuery } from "../../middleware/validateBody.js";
import { AppError } from "../../utils/AppError.js";
import {
  createEngagement,
  createEngagementSchema,
  updateEngagementSchema,
  getEngagement,
  listEngagements,
  engagementListQuerySchema,
  updateEngagement,
  deleteEngagement,
} from "../../services/engagementService.js";

export const engagementsRouter = Router();
engagementsRouter.use(authMiddleware);

engagementsRouter.get(
  "/engagements",
  validateQuery(engagementListQuerySchema),
  async (req, res, next) => {
    try {
      const result = await listEngagements(
        req.validatedQuery as z.infer<typeof engagementListQuerySchema>
      );
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

engagementsRouter.get("/engagements/:id", async (req, res, next) => {
  try {
    const data = await getEngagement(req.params.id!);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

engagementsRouter.post(
  "/engagements",
  validateBody(createEngagementSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
      const data = await createEngagement(
        req.validatedBody as z.infer<typeof createEngagementSchema>,
        req.user.id
      );
      res.status(201).json({ data });
    } catch (e) {
      next(e);
    }
  }
);

engagementsRouter.patch(
  "/engagements/:id",
  validateBody(updateEngagementSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
      const data = await updateEngagement(
        req.params.id!,
        req.validatedBody as z.infer<typeof updateEngagementSchema>,
        req.user.id
      );
      res.json({ data });
    } catch (e) {
      next(e);
    }
  }
);

engagementsRouter.delete(
  "/engagements/:id",
  requireRole("admin"),
  async (req, res, next) => {
    try {
      if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
      await deleteEngagement(req.params.id!, req.user.id);
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  }
);
