import { z } from "zod";
import { Engagement, type IEngagement } from "../models/Engagement.js";
import { Account } from "../models/Account.js";
import { AppError } from "../utils/AppError.js";
import { parseObjectId } from "../utils/id.js";
import { paginationQuerySchema, skipForPage, parseSort } from "../utils/pagination.js";
import { logCommercialChange } from "./auditService.js";

export const createEngagementSchema = z.object({
  accountId: z.string(),
  model: z.enum(["retainer", "project", "hybrid"]),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  billingCadence: z.string().optional(),
  indexationOrRenewalNotes: z.string().optional(),
  documentName: z.string().optional(),
  value: z.number().min(0).optional(),
  periodLabel: z.string().optional(),
  inScope: z.string().optional(),
  outOfScope: z.string().optional(),
  notes: z.string().optional(),
});

export const updateEngagementSchema = createEngagementSchema.omit({ accountId: true }).partial().strict();

const listQuerySchema = paginationQuerySchema.extend({
  accountId: z.string().optional(),
  endingBeforeDays: z.coerce.number().optional(),
});

export { listQuerySchema as engagementListQuerySchema };

const engCommercialFields: (keyof IEngagement)[] = [
  "model",
  "startDate",
  "endDate",
  "billingCadence",
  "indexationOrRenewalNotes",
  "documentName",
  "value",
  "periodLabel",
  "inScope",
  "outOfScope",
  "notes",
];

function pickCommercialSnapshot(e: IEngagement) {
  const o: Record<string, unknown> = {};
  for (const k of engCommercialFields) {
    const v = e[k] as unknown;
    o[k] = v instanceof Date ? v.toISOString() : v;
  }
  return o;
}

function serialize(e: IEngagement) {
  return {
    id: e._id.toString(),
    accountId: e.accountId.toString(),
    model: e.model,
    startDate: e.startDate,
    endDate: e.endDate,
    billingCadence: e.billingCadence,
    indexationOrRenewalNotes: e.indexationOrRenewalNotes,
    documentName: e.documentName,
    value: e.value,
    periodLabel: e.periodLabel,
    inScope: e.inScope,
    outOfScope: e.outOfScope,
    notes: e.notes,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

export async function createEngagement(
  data: z.infer<typeof createEngagementSchema>,
  userId: string
) {
  const acc = await Account.findById(data.accountId);
  if (!acc) throw new AppError(400, "VALIDATION_ERROR", "accountId not found");
  const doc = (await Engagement.create({
    accountId: parseObjectId(data.accountId, "accountId"),
    model: data.model,
    startDate: data.startDate,
    endDate: data.endDate,
    billingCadence: data.billingCadence,
    indexationOrRenewalNotes: data.indexationOrRenewalNotes,
    documentName: data.documentName,
    value: data.value,
    periodLabel: data.periodLabel,
    inScope: data.inScope,
    outOfScope: data.outOfScope,
    notes: data.notes,
  })) as IEngagement;
  await logCommercialChange({
    entityType: "Engagement",
    entityId: doc._id.toString(),
    action: "create",
    changes: { after: pickCommercialSnapshot(doc) },
    performedBy: userId,
  });
  return serialize(doc);
}

export async function getEngagement(id: string) {
  const e = await Engagement.findById(id);
  if (!e) throw new AppError(404, "NOT_FOUND", "Engagement not found");
  return serialize(e);
}

export async function listEngagements(query: z.infer<typeof listQuerySchema>) {
  const filter: Record<string, unknown> = {};
  if (query.accountId) {
    filter.accountId = parseObjectId(query.accountId, "accountId");
  }
  if (query.endingBeforeDays !== undefined) {
    const d = new Date();
    d.setDate(d.getDate() + query.endingBeforeDays);
    filter.endDate = { $lte: d, $gte: new Date() };
  }
  const sort = parseSort(query.sort, ["endDate", "startDate", "createdAt", "value"]) ?? {
    createdAt: -1 as const,
  };
  const [items, total] = await Promise.all([
    Engagement.find(filter)
      .sort(sort)
      .skip(skipForPage(query.page, query.limit))
      .limit(query.limit)
      .lean(),
    Engagement.countDocuments(filter),
  ]);
  return {
    data: items.map((x) => serialize(x as unknown as IEngagement)),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function updateEngagement(
  id: string,
  data: z.infer<typeof updateEngagementSchema>,
  userId: string
) {
  const e = (await Engagement.findById(id)) as IEngagement | null;
  if (!e) throw new AppError(404, "NOT_FOUND", "Engagement not found");
  const before = pickCommercialSnapshot(e);
  if (data.model !== undefined) e.model = data.model;
  if (data.startDate !== undefined) e.startDate = data.startDate;
  if (data.endDate !== undefined) e.endDate = data.endDate;
  if (data.billingCadence !== undefined) e.billingCadence = data.billingCadence;
  if (data.indexationOrRenewalNotes !== undefined) e.indexationOrRenewalNotes = data.indexationOrRenewalNotes;
  if (data.documentName !== undefined) e.documentName = data.documentName;
  if (data.value !== undefined) e.value = data.value;
  if (data.periodLabel !== undefined) e.periodLabel = data.periodLabel;
  if (data.inScope !== undefined) e.inScope = data.inScope;
  if (data.outOfScope !== undefined) e.outOfScope = data.outOfScope;
  if (data.notes !== undefined) e.notes = data.notes;
  await e.save();
  await logCommercialChange({
    entityType: "Engagement",
    entityId: e._id.toString(),
    action: "update",
    changes: { before, after: pickCommercialSnapshot(e) },
    performedBy: userId,
  });
  return serialize(e);
}

export async function deleteEngagement(id: string, userId: string) {
  const e = await Engagement.findById(id);
  if (!e) throw new AppError(404, "NOT_FOUND", "Engagement not found");
  await logCommercialChange({
    entityType: "Engagement",
    entityId: e._id.toString(),
    action: "delete",
    changes: { before: pickCommercialSnapshot(e) },
    performedBy: userId,
  });
  await Engagement.findByIdAndDelete(id);
}
