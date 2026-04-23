import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validateBody, validateQuery } from "../../middleware/validateBody.js";
import { AppError } from "../../utils/AppError.js";
import {
  createAccount,
  createAccountSchema,
  updateAccountSchema,
  getAccount,
  listAccounts,
  accountListQuerySchema,
  updateAccount,
  deleteAccount,
} from "../../services/accountService.js";

export const accountsRouter = Router();
accountsRouter.use(authMiddleware);

accountsRouter.get(
  "/accounts",
  validateQuery(accountListQuerySchema),
  async (req, res, next) => {
    try {
      const result = await listAccounts(
        req.validatedQuery as z.infer<typeof accountListQuerySchema>
      );
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

accountsRouter.get("/accounts/:id", async (req, res, next) => {
  try {
    const data = await getAccount(req.params.id!);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

accountsRouter.post("/accounts", validateBody(createAccountSchema), async (req, res, next) => {
  try {
    if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
    const data = await createAccount(req.validatedBody as z.infer<typeof createAccountSchema>, req.user.id);
    res.status(201).json({ data });
  } catch (e) {
    next(e);
  }
});

accountsRouter.patch("/accounts/:id", validateBody(updateAccountSchema), async (req, res, next) => {
  try {
    if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
    const data = await updateAccount(
      req.params.id!,
      req.validatedBody as z.infer<typeof updateAccountSchema>,
      req.user.id
    );
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

accountsRouter.delete("/accounts/:id", requireRole("admin"), async (req, res, next) => {
  try {
    if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
    await deleteAccount(req.params.id!, req.user.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
