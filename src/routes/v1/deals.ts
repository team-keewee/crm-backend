import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth.js";
import { validateBody, validateQuery } from "../../middleware/validateBody.js";
import { AppError } from "../../utils/AppError.js";
import {
  createDeal,
  createDealSchema,
  updateDealSchema,
  getDeal,
  listDeals,
  dealListQuerySchema,
  updateDeal,
  deleteDeal,
} from "../../services/dealService.js";

export const dealsRouter = Router();
dealsRouter.use(authMiddleware);

dealsRouter.get(
  "/deals",
  validateQuery(dealListQuerySchema),
  async (req, res, next) => {
    try {
      const result = await listDeals(req.validatedQuery as z.infer<typeof dealListQuerySchema>);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

dealsRouter.get("/deals/:id", async (req, res, next) => {
  try {
    const data = await getDeal(req.params.id!);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

dealsRouter.post("/deals", validateBody(createDealSchema), async (req, res, next) => {
  try {
    if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
    const data = await createDeal(req.validatedBody as z.infer<typeof createDealSchema>, req.user.id);
    res.status(201).json({ data });
  } catch (e) {
    next(e);
  }
});

dealsRouter.patch("/deals/:id", validateBody(updateDealSchema), async (req, res, next) => {
  try {
    if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
    const data = await updateDeal(
      req.params.id!,
      req.validatedBody as z.infer<typeof updateDealSchema>,
      req.user.id
    );
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

dealsRouter.delete("/deals/:id", async (req, res, next) => {
  try {
    if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
    await deleteDeal(req.params.id!, req.user.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
