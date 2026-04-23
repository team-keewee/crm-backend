import { z } from "zod";
import { Project, type IProject } from "../models/Project.js";
import { Account } from "../models/Account.js";
import { Engagement } from "../models/Engagement.js";
import { Task } from "../models/Task.js";
import { Deliverable } from "../models/Deliverable.js";
import { AppError } from "../utils/AppError.js";
import { parseObjectId } from "../utils/id.js";
import { paginationQuerySchema, skipForPage, parseSort } from "../utils/pagination.js";

export const createProjectSchema = z.object({
  accountId: z.string(),
  engagementId: z.string().optional(),
  name: z.string().min(1),
  type: z.enum(["seo", "paid", "creative", "content", "web", "other"]).optional(),
  status: z.enum(["planning", "active", "on_hold", "completed", "cancelled"]).optional(),
  startDate: z.coerce.date().optional(),
  targetEndDate: z.coerce.date().optional(),
  ownerId: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
  serviceCatalogItemId: z.string().optional(),
});

export const updateProjectSchema = createProjectSchema.omit({ accountId: true }).partial().strict();

const listQuerySchema = paginationQuerySchema.extend({
  accountId: z.string().optional(),
  status: z
    .enum(["planning", "active", "on_hold", "completed", "cancelled"])
    .optional(),
  ownerId: z.string().optional(),
  search: z.string().optional(),
});

export { listQuerySchema as projectListQuerySchema };

function serialize(p: IProject) {
  return {
    id: p._id.toString(),
    accountId: p.accountId.toString(),
    engagementId: p.engagementId?.toString(),
    name: p.name,
    type: p.type,
    status: p.status,
    startDate: p.startDate,
    targetEndDate: p.targetEndDate,
    ownerId: p.ownerId?.toString(),
    memberIds: p.memberIds.map((id) => id.toString()),
    serviceCatalogItemId: p.serviceCatalogItemId?.toString(),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export async function createProject(data: z.infer<typeof createProjectSchema>) {
  if (!(await Account.findById(data.accountId))) {
    throw new AppError(400, "VALIDATION_ERROR", "accountId not found");
  }
  if (data.engagementId) {
    const e = await Engagement.findById(data.engagementId);
    if (!e) throw new AppError(400, "VALIDATION_ERROR", "engagementId not found");
    if (e.accountId.toString() !== data.accountId) {
      throw new AppError(400, "VALIDATION_ERROR", "engagement does not belong to account");
    }
  }
  if (data.ownerId) {
    const { User } = await import("../models/User.js");
    if (!(await User.findById(data.ownerId))) {
      throw new AppError(400, "VALIDATION_ERROR", "ownerId not found");
    }
  }
  let serviceCatalogItemId: ReturnType<typeof parseObjectId> | undefined;
  if (data.serviceCatalogItemId) {
    const { ServiceCatalogItem } = await import("../models/ServiceCatalogItem.js");
    if (!(await ServiceCatalogItem.findById(data.serviceCatalogItemId))) {
      throw new AppError(400, "VALIDATION_ERROR", "serviceCatalogItemId not found");
    }
    serviceCatalogItemId = parseObjectId(data.serviceCatalogItemId, "serviceCatalogItemId");
  }
  const memberIds = (data.memberIds ?? []).map((id) => parseObjectId(id, "memberId"));
  const p = (await Project.create({
    accountId: parseObjectId(data.accountId, "accountId"),
    engagementId: data.engagementId ? parseObjectId(data.engagementId, "engagementId") : undefined,
    name: data.name,
    type: data.type ?? "other",
    status: data.status ?? "planning",
    startDate: data.startDate,
    targetEndDate: data.targetEndDate,
    ownerId: data.ownerId ? parseObjectId(data.ownerId, "ownerId") : undefined,
    memberIds,
    ...(serviceCatalogItemId && { serviceCatalogItemId }),
  })) as IProject;
  return serialize(p);
}

export async function getProject(id: string) {
  const p = await Project.findById(id);
  if (!p) throw new AppError(404, "NOT_FOUND", "Project not found");
  return serialize(p);
}

export async function listProjects(query: z.infer<typeof listQuerySchema>) {
  const filter: Record<string, unknown> = {};
  if (query.accountId) filter.accountId = parseObjectId(query.accountId, "accountId");
  if (query.status) filter.status = query.status;
  if (query.ownerId) filter.ownerId = parseObjectId(query.ownerId, "ownerId");
  if (query.search) filter.name = { $regex: query.search, $options: "i" };
  const sort = parseSort(query.sort, ["name", "startDate", "targetEndDate", "createdAt", "status"]) ?? {
    createdAt: -1 as const,
  };
  const [items, total] = await Promise.all([
    Project.find(filter)
      .sort(sort)
      .skip(skipForPage(query.page, query.limit))
      .limit(query.limit)
      .lean(),
    Project.countDocuments(filter),
  ]);
  return {
    data: items.map((x) => serialize(x as unknown as IProject)),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function updateProject(id: string, data: z.infer<typeof updateProjectSchema>) {
  const p = (await Project.findById(id)) as IProject | null;
  if (!p) throw new AppError(404, "NOT_FOUND", "Project not found");
  if (data.engagementId) {
    const e = await Engagement.findById(data.engagementId);
    if (!e) throw new AppError(400, "VALIDATION_ERROR", "engagementId not found");
    if (e.accountId.toString() !== p.accountId.toString()) {
      throw new AppError(400, "VALIDATION_ERROR", "engagement does not belong to project account");
    }
  }
  if (data.ownerId) {
    const { User } = await import("../models/User.js");
    if (!(await User.findById(data.ownerId))) {
      throw new AppError(400, "VALIDATION_ERROR", "ownerId not found");
    }
  }
  if (data.serviceCatalogItemId) {
    const { ServiceCatalogItem } = await import("../models/ServiceCatalogItem.js");
    if (!(await ServiceCatalogItem.findById(data.serviceCatalogItemId))) {
      throw new AppError(400, "VALIDATION_ERROR", "serviceCatalogItemId not found");
    }
  }
  if (data.name !== undefined) p.name = data.name;
  if (data.type !== undefined) p.type = data.type;
  if (data.status !== undefined) p.status = data.status;
  if (data.startDate !== undefined) p.startDate = data.startDate;
  if (data.targetEndDate !== undefined) p.targetEndDate = data.targetEndDate;
  if (data.engagementId !== undefined) {
    p.engagementId = data.engagementId ? parseObjectId(data.engagementId, "engagementId") : undefined;
  }
  if (data.ownerId !== undefined) p.ownerId = data.ownerId ? parseObjectId(data.ownerId, "ownerId") : undefined;
  if (data.memberIds !== undefined) {
    p.memberIds = data.memberIds.map((m) => parseObjectId(m, "memberId"));
  }
  if (data.serviceCatalogItemId !== undefined) {
    p.serviceCatalogItemId = data.serviceCatalogItemId
      ? parseObjectId(data.serviceCatalogItemId, "serviceCatalogItemId")
      : undefined;
  }
  await p.save();
  return serialize(p);
}

export async function deleteProject(id: string) {
  const p = await Project.findByIdAndDelete(id);
  if (!p) throw new AppError(404, "NOT_FOUND", "Project not found");
  await Task.deleteMany({ projectId: p._id });
  await Deliverable.deleteMany({ projectId: p._id });
}
