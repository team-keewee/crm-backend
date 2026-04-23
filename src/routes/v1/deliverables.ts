import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth.js";
import { validateBody, validateQuery } from "../../middleware/validateBody.js";
import {
  createDeliverable,
  createDeliverableSchema,
  updateDeliverableSchema,
  getDeliverable,
  listDeliverables,
  deliverableListQuerySchema,
  updateDeliverable,
  deleteDeliverable,
} from "../../services/deliverableService.js";

export const deliverablesRouter = Router();
deliverablesRouter.use(authMiddleware);

deliverablesRouter.get(
  "/deliverables",
  validateQuery(deliverableListQuerySchema),
  async (req, res, next) => {
    try {
      const result = await listDeliverables(
        req.validatedQuery as z.infer<typeof deliverableListQuerySchema>
      );
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

deliverablesRouter.get("/deliverables/:id", async (req, res, next) => {
  try {
    const data = await getDeliverable(req.params.id!);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

deliverablesRouter.post(
  "/deliverables",
  validateBody(createDeliverableSchema),
  async (req, res, next) => {
    try {
      const data = await createDeliverable(
        req.validatedBody as z.infer<typeof createDeliverableSchema>
      );
      res.status(201).json({ data });
    } catch (e) {
      next(e);
    }
  }
);

deliverablesRouter.patch(
  "/deliverables/:id",
  validateBody(updateDeliverableSchema),
  async (req, res, next) => {
    try {
      const data = await updateDeliverable(
        req.params.id!,
        req.validatedBody as z.infer<typeof updateDeliverableSchema>
      );
      res.json({ data });
    } catch (e) {
      next(e);
    }
  }
);

deliverablesRouter.delete("/deliverables/:id", async (req, res, next) => {
  try {
    await deleteDeliverable(req.params.id!);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
