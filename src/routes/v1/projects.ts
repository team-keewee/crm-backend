import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth.js";
import { validateBody, validateQuery } from "../../middleware/validateBody.js";
import {
  createProject,
  createProjectSchema,
  updateProjectSchema,
  getProject,
  listProjects,
  projectListQuerySchema,
  updateProject,
  deleteProject,
} from "../../services/projectService.js";

export const projectsRouter = Router();
projectsRouter.use(authMiddleware);

projectsRouter.get(
  "/projects",
  validateQuery(projectListQuerySchema),
  async (req, res, next) => {
    try {
      const result = await listProjects(
        req.validatedQuery as z.infer<typeof projectListQuerySchema>
      );
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

projectsRouter.get("/projects/:id", async (req, res, next) => {
  try {
    const data = await getProject(req.params.id!);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

projectsRouter.post("/projects", validateBody(createProjectSchema), async (req, res, next) => {
  try {
    const data = await createProject(req.validatedBody as z.infer<typeof createProjectSchema>);
    res.status(201).json({ data });
  } catch (e) {
    next(e);
  }
});

projectsRouter.patch(
  "/projects/:id",
  validateBody(updateProjectSchema),
  async (req, res, next) => {
    try {
      const data = await updateProject(
        req.params.id!,
        req.validatedBody as z.infer<typeof updateProjectSchema>
      );
      res.json({ data });
    } catch (e) {
      next(e);
    }
  }
);

projectsRouter.delete("/projects/:id", async (req, res, next) => {
  try {
    await deleteProject(req.params.id!);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
