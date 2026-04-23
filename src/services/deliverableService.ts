import { z } from "zod";
import { Deliverable, type IDeliverable } from "../models/Deliverable.js";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { AppError } from "../utils/AppError.js";
import { parseObjectId } from "../utils/id.js";
import { paginationQuerySchema, skipForPage, parseSort } from "../utils/pagination.js";

export const createDeliverableSchema = z.object({
  projectId: z.string(),
  taskId: z.string().optional(),
  title: z.string().min(1),
  dueDate: z.coerce.date().optional(),
  approvalStatus: z
    .enum(["submitted", "in_review", "approved", "rejected"])
    .optional(),
  submittedBy: z.string().optional(),
  reviewedBy: z.string().optional(),
});

export const updateDeliverableSchema = createDeliverableSchema.omit({ projectId: true }).partial().strict();

const listQuerySchema = paginationQuerySchema.extend({
  projectId: z.string(),
  approvalStatus: z.enum(["submitted", "in_review", "approved", "rejected"]).optional(),
});

export { listQuerySchema as deliverableListQuerySchema };

function serialize(d: IDeliverable) {
  return {
    id: d._id.toString(),
    projectId: d.projectId.toString(),
    taskId: d.taskId?.toString(),
    title: d.title,
    dueDate: d.dueDate,
    approvalStatus: d.approvalStatus,
    submittedBy: d.submittedBy?.toString(),
    reviewedBy: d.reviewedBy?.toString(),
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export async function createDeliverable(data: z.infer<typeof createDeliverableSchema>) {
  const project = await Project.findById(data.projectId);
  if (!project) throw new AppError(400, "VALIDATION_ERROR", "projectId not found");
  const projectOid = project._id;
  if (data.taskId) {
    const task = await Task.findById(data.taskId);
    if (!task) throw new AppError(400, "VALIDATION_ERROR", "taskId not found");
    if (task.projectId.toString() !== projectOid.toString()) {
      throw new AppError(400, "VALIDATION_ERROR", "task does not belong to project");
    }
  }
  for (const ref of [data.submittedBy, data.reviewedBy] as const) {
    if (ref) {
      const { User } = await import("../models/User.js");
      if (!(await User.findById(ref))) {
        throw new AppError(400, "VALIDATION_ERROR", "user reference not found");
      }
    }
  }
  const doc = (await Deliverable.create({
    projectId: projectOid,
    taskId: data.taskId ? parseObjectId(data.taskId, "taskId") : undefined,
    title: data.title,
    dueDate: data.dueDate,
    approvalStatus: data.approvalStatus ?? "submitted",
    submittedBy: data.submittedBy ? parseObjectId(data.submittedBy, "submittedBy") : undefined,
    reviewedBy: data.reviewedBy ? parseObjectId(data.reviewedBy, "reviewedBy") : undefined,
  })) as IDeliverable;
  return serialize(doc);
}

export async function getDeliverable(id: string) {
  const d = await Deliverable.findById(id);
  if (!d) throw new AppError(404, "NOT_FOUND", "Deliverable not found");
  return serialize(d);
}

export async function listDeliverables(query: z.infer<typeof listQuerySchema>) {
  const filter: Record<string, unknown> = {
    projectId: parseObjectId(query.projectId, "projectId"),
  };
  if (query.approvalStatus) filter.approvalStatus = query.approvalStatus;
  const sort = parseSort(query.sort, ["dueDate", "approvalStatus", "createdAt"]) ?? {
    dueDate: 1 as const,
  };
  const [items, total] = await Promise.all([
    Deliverable.find(filter)
      .sort(sort)
      .skip(skipForPage(query.page, query.limit))
      .limit(query.limit)
      .lean(),
    Deliverable.countDocuments(filter),
  ]);
  return {
    data: items.map((x) => serialize(x as unknown as IDeliverable)),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function updateDeliverable(id: string, data: z.infer<typeof updateDeliverableSchema>) {
  const d = (await Deliverable.findById(id)) as IDeliverable | null;
  if (!d) throw new AppError(404, "NOT_FOUND", "Deliverable not found");
  if (data.taskId) {
    const task = await Task.findById(data.taskId);
    if (!task) throw new AppError(400, "VALIDATION_ERROR", "taskId not found");
    if (task.projectId.toString() !== d.projectId.toString()) {
      throw new AppError(400, "VALIDATION_ERROR", "task does not belong to same project as deliverable");
    }
  }
  for (const [key, ref] of Object.entries({ submittedBy: data.submittedBy, reviewedBy: data.reviewedBy })) {
    if (ref) {
      const { User } = await import("../models/User.js");
      if (!(await User.findById(ref))) {
        throw new AppError(400, "VALIDATION_ERROR", `${key} user not found`);
      }
    }
  }
  if (data.title !== undefined) d.title = data.title;
  if (data.dueDate !== undefined) d.dueDate = data.dueDate;
  if (data.approvalStatus !== undefined) d.approvalStatus = data.approvalStatus;
  if (data.taskId !== undefined) d.taskId = data.taskId ? parseObjectId(data.taskId, "taskId") : undefined;
  if (data.submittedBy !== undefined) {
    d.submittedBy = data.submittedBy ? parseObjectId(data.submittedBy, "submittedBy") : undefined;
  }
  if (data.reviewedBy !== undefined) {
    d.reviewedBy = data.reviewedBy ? parseObjectId(data.reviewedBy, "reviewedBy") : undefined;
  }
  await d.save();
  return serialize(d);
}

export async function deleteDeliverable(id: string) {
  const d = await Deliverable.findByIdAndDelete(id);
  if (!d) throw new AppError(404, "NOT_FOUND", "Deliverable not found");
}
