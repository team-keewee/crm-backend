import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validateQuery } from "../../middleware/validateBody.js";
import { listAuditLogs } from "../../services/auditService.js";
import { paginationQuerySchema } from "../../utils/pagination.js";

const auditListQuery = paginationQuerySchema.extend({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
});

export const auditRouter = Router();
auditRouter.use(authMiddleware);
auditRouter.use(requireRole("admin"));

auditRouter.get(
  "/audit-logs",
  validateQuery(auditListQuery),
  async (req, res, next) => {
    try {
      const q = req.validatedQuery as z.infer<typeof auditListQuery>;
      const result = await listAuditLogs({
        entityType: q.entityType,
        entityId: q.entityId,
        page: q.page,
        limit: q.limit,
      });
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);
