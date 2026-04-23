import { z } from "zod";
import { Activity, type IActivity } from "../models/Activity.js";
import { Account } from "../models/Account.js";
import { Deal } from "../models/Deal.js";
import { Project } from "../models/Project.js";
import { AppError } from "../utils/AppError.js";
import { parseObjectId } from "../utils/id.js";
import { paginationQuerySchema, skipForPage, parseSort } from "../utils/pagination.js";

export const createActivitySchema = z
  .object({
    type: z.enum(["call", "meeting", "email", "note", "other"]),
    subject: z.string().min(1),
    body: z.string().optional(),
    occurredAt: z.coerce.date().optional(),
    accountId: z.string().optional(),
    dealId: z.string().optional(),
    projectId: z.string().optional(),
  })
  .refine(
    (d) => Boolean(d.accountId || d.dealId || d.projectId),
    { message: "At least one of accountId, dealId, or projectId is required" }
  );

export const updateActivitySchema = z
  .object({
    type: z.enum(["call", "meeting", "email", "note", "other"]).optional(),
    subject: z.string().min(1).optional(),
    body: z.string().optional(),
    occurredAt: z.coerce.date().optional(),
    accountId: z.string().optional(),
    dealId: z.string().optional(),
    projectId: z.string().optional(),
  })
  .strict();

const listQuerySchema = paginationQuerySchema.extend({
  accountId: z.string().optional(),
  dealId: z.string().optional(),
  projectId: z.string().optional(),
  type: z.enum(["call", "meeting", "email", "note", "other"]).optional(),
});

export { listQuerySchema as activityListQuerySchema };

function serialize(a: IActivity) {
  return {
    id: a._id.toString(),
    type: a.type,
    subject: a.subject,
    body: a.body,
    occurredAt: a.occurredAt,
    accountId: a.accountId?.toString(),
    dealId: a.dealId?.toString(),
    projectId: a.projectId?.toString(),
    createdBy: a.createdBy.toString(),
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

export async function createActivity(
  data: z.infer<typeof createActivitySchema>,
  userId: string
) {
  if (data.accountId && !(await Account.findById(data.accountId))) {
    throw new AppError(400, "VALIDATION_ERROR", "accountId not found");
  }
  if (data.dealId && !(await Deal.findById(data.dealId))) {
    throw new AppError(400, "VALIDATION_ERROR", "dealId not found");
  }
  if (data.projectId && !(await Project.findById(data.projectId))) {
    throw new AppError(400, "VALIDATION_ERROR", "projectId not found");
  }
  const doc = (await Activity.create({
    type: data.type,
    subject: data.subject,
    body: data.body,
    occurredAt: data.occurredAt ?? new Date(),
    accountId: data.accountId ? parseObjectId(data.accountId, "accountId") : undefined,
    dealId: data.dealId ? parseObjectId(data.dealId, "dealId") : undefined,
    projectId: data.projectId ? parseObjectId(data.projectId, "projectId") : undefined,
    createdBy: parseObjectId(userId, "userId"),
  })) as IActivity;
  return serialize(doc);
}

export async function getActivity(id: string) {
  const a = await Activity.findById(id);
  if (!a) throw new AppError(404, "NOT_FOUND", "Activity not found");
  return serialize(a);
}

export async function listActivities(query: z.infer<typeof listQuerySchema>) {
  const filter: Record<string, unknown> = {};
  if (query.accountId) filter.accountId = parseObjectId(query.accountId, "accountId");
  if (query.dealId) filter.dealId = parseObjectId(query.dealId, "dealId");
  if (query.projectId) filter.projectId = parseObjectId(query.projectId, "projectId");
  if (query.type) filter.type = query.type;
  const sort = parseSort(query.sort, ["occurredAt", "createdAt", "subject"]) ?? {
    occurredAt: -1 as const,
  };
  const [items, total] = await Promise.all([
    Activity.find(filter)
      .sort(sort)
      .skip(skipForPage(query.page, query.limit))
      .limit(query.limit)
      .lean(),
    Activity.countDocuments(filter),
  ]);
  return {
    data: items.map((x) => serialize(x as unknown as IActivity)),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function updateActivity(id: string, data: z.infer<typeof updateActivitySchema>) {
  const a = (await Activity.findById(id)) as IActivity | null;
  if (!a) throw new AppError(404, "NOT_FOUND", "Activity not found");
  if (data.accountId) {
    if (!(await Account.findById(data.accountId))) {
      throw new AppError(400, "VALIDATION_ERROR", "accountId not found");
    }
  }
  if (data.dealId) {
    if (!(await Deal.findById(data.dealId))) {
      throw new AppError(400, "VALIDATION_ERROR", "dealId not found");
    }
  }
  if (data.projectId) {
    if (!(await Project.findById(data.projectId))) {
      throw new AppError(400, "VALIDATION_ERROR", "projectId not found");
    }
  }
  if (data.type !== undefined) a.type = data.type;
  if (data.subject !== undefined) a.subject = data.subject;
  if (data.body !== undefined) a.body = data.body;
  if (data.occurredAt !== undefined) a.occurredAt = data.occurredAt;
  if (data.accountId !== undefined) a.accountId = data.accountId ? parseObjectId(data.accountId, "accountId") : undefined;
  if (data.dealId !== undefined) a.dealId = data.dealId ? parseObjectId(data.dealId, "dealId") : undefined;
  if (data.projectId !== undefined) {
    a.projectId = data.projectId ? parseObjectId(data.projectId, "projectId") : undefined;
  }
  const links = [a.accountId, a.dealId, a.projectId].filter(Boolean);
  if (links.length === 0) {
    throw new AppError(400, "VALIDATION_ERROR", "At least one of account, deal, or project is required");
  }
  await a.save();
  return serialize(a);
}

export async function deleteActivity(id: string) {
  const a = await Activity.findByIdAndDelete(id);
  if (!a) throw new AppError(404, "NOT_FOUND", "Activity not found");
}
