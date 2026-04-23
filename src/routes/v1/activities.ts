import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth.js";
import { validateBody, validateQuery } from "../../middleware/validateBody.js";
import { AppError } from "../../utils/AppError.js";
import {
  createActivity,
  createActivitySchema,
  updateActivitySchema,
  getActivity,
  listActivities,
  activityListQuerySchema,
  updateActivity,
  deleteActivity,
} from "../../services/activityService.js";

export const activitiesRouter = Router();
activitiesRouter.use(authMiddleware);

activitiesRouter.get(
  "/activities",
  validateQuery(activityListQuerySchema),
  async (req, res, next) => {
    try {
      const result = await listActivities(
        req.validatedQuery as z.infer<typeof activityListQuerySchema>
      );
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

activitiesRouter.get("/activities/:id", async (req, res, next) => {
  try {
    const data = await getActivity(req.params.id!);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

activitiesRouter.post("/activities", validateBody(createActivitySchema), async (req, res, next) => {
  try {
    if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
    const data = await createActivity(
      req.validatedBody as z.infer<typeof createActivitySchema>,
      req.user.id
    );
    res.status(201).json({ data });
  } catch (e) {
    next(e);
  }
});

activitiesRouter.patch(
  "/activities/:id",
  validateBody(updateActivitySchema),
  async (req, res, next) => {
    try {
      const data = await updateActivity(
        req.params.id!,
        req.validatedBody as z.infer<typeof updateActivitySchema>
      );
      res.json({ data });
    } catch (e) {
      next(e);
    }
  }
);

activitiesRouter.delete("/activities/:id", async (req, res, next) => {
  try {
    await deleteActivity(req.params.id!);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
