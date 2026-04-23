import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validateBody, validateQuery } from "../../middleware/validateBody.js";
import {
  createServiceCatalogItem,
  createServiceCatalogItemSchema,
  updateServiceCatalogItemSchema,
  getServiceCatalogItem,
  listServiceCatalogItems,
  serviceCatalogListQuerySchema,
  updateServiceCatalogItem,
  deleteServiceCatalogItem,
} from "../../services/serviceCatalogService.js";

export const serviceCatalogRouter = Router();
serviceCatalogRouter.use(authMiddleware);

serviceCatalogRouter.get(
  "/service-catalog",
  validateQuery(serviceCatalogListQuerySchema),
  async (req, res, next) => {
    try {
      const result = await listServiceCatalogItems(
        req.validatedQuery as z.infer<typeof serviceCatalogListQuerySchema>
      );
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

serviceCatalogRouter.get("/service-catalog/:id", async (req, res, next) => {
  try {
    const data = await getServiceCatalogItem(req.params.id!);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

serviceCatalogRouter.post(
  "/service-catalog",
  requireRole("admin"),
  validateBody(createServiceCatalogItemSchema),
  async (req, res, next) => {
    try {
      const data = await createServiceCatalogItem(
        req.validatedBody as z.infer<typeof createServiceCatalogItemSchema>
      );
      res.status(201).json({ data });
    } catch (e) {
      next(e);
    }
  }
);

serviceCatalogRouter.patch(
  "/service-catalog/:id",
  requireRole("admin"),
  validateBody(updateServiceCatalogItemSchema),
  async (req, res, next) => {
    try {
      const data = await updateServiceCatalogItem(
        req.params.id!,
        req.validatedBody as z.infer<typeof updateServiceCatalogItemSchema>
      );
      res.json({ data });
    } catch (e) {
      next(e);
    }
  }
);

serviceCatalogRouter.delete(
  "/service-catalog/:id",
  requireRole("admin"),
  async (req, res, next) => {
    try {
      await deleteServiceCatalogItem(req.params.id!);
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  }
);
