import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth.js";
import { validateBody, validateQuery } from "../../middleware/validateBody.js";
import {
  createContact,
  createContactSchema,
  updateContactSchema,
  getContact,
  listContacts,
  contactListQuerySchema,
  updateContact,
  deleteContact,
} from "../../services/contactService.js";

export const contactsRouter = Router();
contactsRouter.use(authMiddleware);

contactsRouter.get(
  "/contacts",
  validateQuery(contactListQuerySchema),
  async (req, res, next) => {
    try {
      const result = await listContacts(
        req.validatedQuery as z.infer<typeof contactListQuerySchema>
      );
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

contactsRouter.get("/contacts/:id", async (req, res, next) => {
  try {
    const data = await getContact(req.params.id!);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

contactsRouter.post("/contacts", validateBody(createContactSchema), async (req, res, next) => {
  try {
    const data = await createContact(req.validatedBody as z.infer<typeof createContactSchema>);
    res.status(201).json({ data });
  } catch (e) {
    next(e);
  }
});

contactsRouter.patch("/contacts/:id", validateBody(updateContactSchema), async (req, res, next) => {
  try {
    const data = await updateContact(
      req.params.id!,
      req.validatedBody as z.infer<typeof updateContactSchema>
    );
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

contactsRouter.delete("/contacts/:id", async (req, res, next) => {
  try {
    await deleteContact(req.params.id!);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
