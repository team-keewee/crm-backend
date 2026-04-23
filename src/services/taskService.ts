import type mongoose from "mongoose";
import { z } from "zod";
import { Task, type ITask } from "../models/Task.js";
import { Project } from "../models/Project.js";
import { Deliverable } from "../models/Deliverable.js";
import { AppError } from "../utils/AppError.js";
import { parseObjectId } from "../utils/id.js";
import { paginationQuerySchema, skipForPage, parseSort } from "../utils/pagination.js";

export const createTaskSchema = z.object({
  projectId: z.string(),
  parentTaskId: z.string().optional(),
  title: z.string().min(1),
  status: z.enum(["backlog", "in_progress", "review", "done"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z.coerce.date().optional(),
  assigneeId: z.string().optional(),
  dependencyTaskIds: z.array(z.string()).optional(),
});

export const updateTaskSchema = createTaskSchema.omit({ projectId: true }).partial().strict();

const listQuerySchema = paginationQuerySchema.extend({
  projectId: z.string(),
  status: z.enum(["backlog", "in_progress", "review", "done"]).optional(),
  assigneeId: z.string().optional(),
  onlyRoot: z.coerce.boolean().optional(),
});

export { listQuerySchema as taskListQuerySchema };

function serialize(t: ITask) {
  return {
    id: t._id.toString(),
    projectId: t.projectId.toString(),
    parentTaskId: t.parentTaskId?.toString(),
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate,
    assigneeId: t.assigneeId?.toString(),
    dependencyTaskIds: t.dependencyTaskIds.map((id) => id.toString()),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

async function assertTaskInProject(
  projectId: mongoose.Types.ObjectId,
  taskId: string,
  label: string
) {
  const t = await Task.findById(taskId);
  if (!t) throw new AppError(400, "VALIDATION_ERROR", `${label} not found`);
  if (t.projectId.toString() !== projectId.toString()) {
    throw new AppError(400, "VALIDATION_ERROR", `${label} is not in the same project`);
  }
  return t;
}

export async function createTask(data: z.infer<typeof createTaskSchema>) {
  const project = await Project.findById(data.projectId);
  if (!project) throw new AppError(400, "VALIDATION_ERROR", "projectId not found");
  const projectOid = project._id as mongoose.Types.ObjectId;
  if (data.assigneeId) {
    const { User } = await import("../models/User.js");
    if (!(await User.findById(data.assigneeId))) {
      throw new AppError(400, "VALIDATION_ERROR", "assigneeId not found");
    }
  }
  if (data.parentTaskId) {
    await assertTaskInProject(projectOid, data.parentTaskId, "parentTaskId");
  }
  for (const dep of data.dependencyTaskIds ?? []) {
    const d = await assertTaskInProject(projectOid, dep, "dependency");
    if (d._id.toString() === data.parentTaskId) continue;
  }
  const dependencyTaskIds: mongoose.Types.ObjectId[] = (data.dependencyTaskIds ?? []).map((id) => {
    return parseObjectId(id, "dependencyTaskId");
  });
  const t = (await Task.create({
    projectId: projectOid,
    parentTaskId: data.parentTaskId ? parseObjectId(data.parentTaskId, "parentTaskId") : undefined,
    title: data.title,
    status: data.status ?? "backlog",
    priority: data.priority ?? "medium",
    dueDate: data.dueDate,
    assigneeId: data.assigneeId ? parseObjectId(data.assigneeId, "assigneeId") : undefined,
    dependencyTaskIds,
  })) as ITask;
  return serialize(t);
}

export async function getTask(id: string) {
  const t = await Task.findById(id);
  if (!t) throw new AppError(404, "NOT_FOUND", "Task not found");
  return serialize(t);
}

export async function listTasks(query: z.infer<typeof listQuerySchema>) {
  const projectOid = parseObjectId(query.projectId, "projectId");
  const base: Record<string, unknown> = { projectId: projectOid };
  if (query.status) base.status = query.status;
  if (query.assigneeId) base.assigneeId = parseObjectId(query.assigneeId, "assigneeId");
  const filter: Record<string, unknown> =
    query.onlyRoot === true
      ? {
          $and: [
            base,
            { $or: [{ parentTaskId: null }, { parentTaskId: { $exists: false } }] },
          ],
        }
      : base;
  const sort = parseSort(query.sort, ["dueDate", "priority", "status", "createdAt"]) ?? {
    dueDate: 1 as const,
  };
  const [items, total] = await Promise.all([
    Task.find(filter)
      .sort(sort)
      .skip(skipForPage(query.page, query.limit))
      .limit(query.limit)
      .lean(),
    Task.countDocuments(filter),
  ]);
  return {
    data: items.map((x) => serialize(x as unknown as ITask)),
    total,
    page: query.page,
    limit: query.limit,
  };
}

function wouldCreateCycle(
  taskId: string,
  newDeps: mongoose.Types.ObjectId[],
  byId: Map<string, ITask>
): boolean {
  function canReachTaskFrom(start: string, visited: Set<string>): boolean {
    if (start === taskId) return true;
    if (visited.has(start)) return false;
    visited.add(start);
    const node = byId.get(start);
    if (!node) return false;
    for (const d of node.dependencyTaskIds) {
      if (canReachTaskFrom(d.toString(), new Set(visited))) return true;
    }
    return false;
  }
  for (const d of newDeps) {
    if (canReachTaskFrom(d.toString(), new Set())) return true;
  }
  return false;
}

export async function updateTask(id: string, data: z.infer<typeof updateTaskSchema>) {
  const t = (await Task.findById(id)) as ITask | null;
  if (!t) throw new AppError(404, "NOT_FOUND", "Task not found");
  const projectOid = t.projectId as mongoose.Types.ObjectId;
  if (data.assigneeId) {
    const { User } = await import("../models/User.js");
    if (!(await User.findById(data.assigneeId))) {
      throw new AppError(400, "VALIDATION_ERROR", "assigneeId not found");
    }
  }
  if (data.parentTaskId !== undefined) {
    if (data.parentTaskId) {
      if (data.parentTaskId === id) {
        throw new AppError(400, "VALIDATION_ERROR", "Task cannot be its own parent");
      }
      await assertTaskInProject(projectOid, data.parentTaskId, "parentTaskId");
    }
  }
  if (data.dependencyTaskIds) {
    const newDeps = data.dependencyTaskIds.map((x) => parseObjectId(x, "dependencyTaskId"));
    for (const d of newDeps) {
      await assertTaskInProject(projectOid, d.toString(), "dependency");
    }
    const all = await Task.find({ projectId: projectOid }).lean();
    const byId = new Map<string, ITask>(
      all.map((x) => [x._id.toString(), x as unknown as ITask])
    );
    if (wouldCreateCycle(id, newDeps, byId)) {
      throw new AppError(400, "VALIDATION_ERROR", "Dependency graph would create a cycle");
    }
    t.dependencyTaskIds = newDeps;
  }
  if (data.title !== undefined) t.title = data.title;
  if (data.status !== undefined) t.status = data.status;
  if (data.priority !== undefined) t.priority = data.priority;
  if (data.dueDate !== undefined) t.dueDate = data.dueDate;
  if (data.assigneeId !== undefined) {
    t.assigneeId = data.assigneeId ? parseObjectId(data.assigneeId, "assigneeId") : undefined;
  }
  if (data.parentTaskId !== undefined) {
    t.parentTaskId = data.parentTaskId ? parseObjectId(data.parentTaskId, "parentTaskId") : undefined;
  }
  await t.save();
  return serialize(t);
}

export async function deleteTask(id: string) {
  const t = await Task.findById(id);
  if (!t) throw new AppError(404, "NOT_FOUND", "Task not found");
  const children = await Task.countDocuments({ parentTaskId: t._id });
  if (children > 0) {
    throw new AppError(400, "CONFLICT", "Delete or reassign child tasks first");
  }
  await Task.updateMany(
    { projectId: t.projectId },
    { $pull: { dependencyTaskIds: t._id } }
  );
  await Deliverable.updateMany({ taskId: t._id }, { $unset: { taskId: 1 } });
  await Task.findByIdAndDelete(id);
}
