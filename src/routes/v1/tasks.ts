import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth.js";
import { validateBody, validateQuery } from "../../middleware/validateBody.js";
import {
  createTask,
  createTaskSchema,
  updateTaskSchema,
  getTask,
  listTasks,
  taskListQuerySchema,
  updateTask,
  deleteTask,
} from "../../services/taskService.js";

export const tasksRouter = Router();
tasksRouter.use(authMiddleware);

tasksRouter.get(
  "/tasks",
  validateQuery(taskListQuerySchema),
  async (req, res, next) => {
    try {
      const result = await listTasks(
        req.validatedQuery as z.infer<typeof taskListQuerySchema>
      );
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

tasksRouter.get("/tasks/:id", async (req, res, next) => {
  try {
    const data = await getTask(req.params.id!);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

tasksRouter.post("/tasks", validateBody(createTaskSchema), async (req, res, next) => {
  try {
    const data = await createTask(req.validatedBody as z.infer<typeof createTaskSchema>);
    res.status(201).json({ data });
  } catch (e) {
    next(e);
  }
});

tasksRouter.patch("/tasks/:id", validateBody(updateTaskSchema), async (req, res, next) => {
  try {
    const data = await updateTask(
      req.params.id!,
      req.validatedBody as z.infer<typeof updateTaskSchema>
    );
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

tasksRouter.delete("/tasks/:id", async (req, res, next) => {
  try {
    await deleteTask(req.params.id!);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
