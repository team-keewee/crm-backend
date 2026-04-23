import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth.js";
import { validateQuery } from "../../middleware/validateBody.js";
import { getDashboardSummary, dashboardQuerySchema } from "../../services/dashboardService.js";

export const dashboardRouter = Router();
dashboardRouter.use(authMiddleware);

dashboardRouter.get(
  "/dashboard/summary",
  validateQuery(dashboardQuerySchema),
  async (req, res, next) => {
    try {
      const summary = await getDashboardSummary(
        req.validatedQuery as z.infer<typeof dashboardQuerySchema>
      );
      res.json({ data: summary });
    } catch (e) {
      next(e);
    }
  }
);
