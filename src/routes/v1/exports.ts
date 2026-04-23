import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth.js";
import { validateQuery } from "../../middleware/validateBody.js";
import {
  streamAccountsCsv,
  streamDealsCsv,
  accountsExportQuerySchema,
  dealsExportQuerySchema,
} from "../../services/exportService.js";

export const exportsRouter = Router();
exportsRouter.use(authMiddleware);

exportsRouter.get(
  "/export/accounts.csv",
  validateQuery(accountsExportQuerySchema),
  async (req, res, next) => {
    try {
      const csv = await streamAccountsCsv(
        req.validatedQuery as z.infer<typeof accountsExportQuerySchema>
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=accounts.csv");
      res.send(csv);
    } catch (e) {
      next(e);
    }
  }
);

exportsRouter.get(
  "/export/deals.csv",
  validateQuery(dealsExportQuerySchema),
  async (req, res, next) => {
    try {
      const csv = await streamDealsCsv(
        req.validatedQuery as z.infer<typeof dealsExportQuerySchema>
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=deals.csv");
      res.send(csv);
    } catch (e) {
      next(e);
    }
  }
);
