import { z } from "zod";
import { Deal, type IDeal } from "../models/Deal.js";
import { Account } from "../models/Account.js";
import { AppError } from "../utils/AppError.js";
import { parseObjectId } from "../utils/id.js";
import { paginationQuerySchema, skipForPage, parseSort } from "../utils/pagination.js";
import { logCommercialChange } from "./auditService.js";

export const createDealSchema = z.object({
  accountId: z.string(),
  name: z.string().min(1),
  stage: z.enum(["discovery", "proposal", "negotiation", "won", "lost"]).optional(),
  expectedValue: z.number().min(0).optional(),
  winProbability: z.number().min(0).max(100).optional(),
  closeDate: z.coerce.date().optional(),
  ownerId: z.string().optional(),
  leadSource: z
    .enum(["referral", "inbound", "partner", "rfp", "upsell", "other"])
    .optional(),
  lossReason: z.string().optional(),
  competitorTags: z.array(z.string()).optional(),
  serviceCatalogItemId: z.string().optional(),
});

export const updateDealSchema = createDealSchema.omit({ accountId: true }).partial().strict();

const listQuerySchema = paginationQuerySchema.extend({
  accountId: z.string().optional(),
  stage: z
    .enum(["discovery", "proposal", "negotiation", "won", "lost"])
    .optional(),
  ownerId: z.string().optional(),
  search: z.string().optional(),
});

export { listQuerySchema as dealListQuerySchema };

const dealCommercialFields: (keyof IDeal)[] = [
  "name",
  "stage",
  "expectedValue",
  "winProbability",
  "closeDate",
  "leadSource",
  "lossReason",
  "competitorTags",
  "ownerId",
];

function pickCommercialSnapshot(d: IDeal) {
  const o: Record<string, unknown> = {};
  for (const k of dealCommercialFields) {
    const v = d[k] as unknown;
    o[k] = v instanceof Date ? v.toISOString() : v;
    if (k === "ownerId" && d.ownerId) o[k] = d.ownerId.toString();
  }
  return o;
}

function serialize(d: IDeal) {
  return {
    id: d._id.toString(),
    accountId: d.accountId.toString(),
    name: d.name,
    stage: d.stage,
    expectedValue: d.expectedValue,
    winProbability: d.winProbability,
    closeDate: d.closeDate,
    ownerId: d.ownerId?.toString(),
    leadSource: d.leadSource,
    lossReason: d.lossReason,
    competitorTags: d.competitorTags,
    serviceCatalogItemId: d.serviceCatalogItemId?.toString(),
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export async function createDeal(
  data: z.infer<typeof createDealSchema>,
  userId: string
) {
  const acc = await Account.findById(data.accountId);
  if (!acc) throw new AppError(400, "VALIDATION_ERROR", "accountId not found");
  if (data.ownerId) {
    const { User } = await import("../models/User.js");
    if (!(await User.findById(data.ownerId))) {
      throw new AppError(400, "VALIDATION_ERROR", "ownerId not found");
    }
  }
  let serviceCatalogItemId: ReturnType<typeof parseObjectId> | undefined;
  if (data.serviceCatalogItemId) {
    const { ServiceCatalogItem } = await import("../models/ServiceCatalogItem.js");
    const exists = await ServiceCatalogItem.findById(data.serviceCatalogItemId);
    if (!exists) throw new AppError(400, "VALIDATION_ERROR", "serviceCatalogItemId not found");
    serviceCatalogItemId = parseObjectId(data.serviceCatalogItemId, "serviceCatalogItemId");
  }
  const doc = (await Deal.create({
    accountId: parseObjectId(data.accountId, "accountId"),
    name: data.name,
    stage: data.stage ?? "discovery",
    expectedValue: data.expectedValue ?? 0,
    winProbability: data.winProbability ?? 0,
    closeDate: data.closeDate,
    ownerId: data.ownerId ? parseObjectId(data.ownerId, "ownerId") : undefined,
    leadSource: data.leadSource ?? "other",
    lossReason: data.lossReason,
    competitorTags: data.competitorTags ?? [],
    ...(serviceCatalogItemId && { serviceCatalogItemId }),
  })) as IDeal;
  await logCommercialChange({
    entityType: "Deal",
    entityId: doc._id.toString(),
    action: "create",
    changes: { after: pickCommercialSnapshot(doc) },
    performedBy: userId,
  });
  return serialize(doc);
}

export async function getDeal(id: string) {
  const d = await Deal.findById(id);
  if (!d) throw new AppError(404, "NOT_FOUND", "Deal not found");
  return serialize(d);
}

export async function listDeals(query: z.infer<typeof listQuerySchema>) {
  const filter: Record<string, unknown> = {};
  if (query.accountId) filter.accountId = parseObjectId(query.accountId, "accountId");
  if (query.stage) filter.stage = query.stage;
  if (query.ownerId) filter.ownerId = parseObjectId(query.ownerId, "ownerId");
  if (query.search) {
    filter.name = { $regex: query.search, $options: "i" };
  }
  const sort = parseSort(query.sort, ["closeDate", "expectedValue", "createdAt", "stage"]) ?? {
    createdAt: -1 as const,
  };
  const [items, total] = await Promise.all([
    Deal.find(filter)
      .sort(sort)
      .skip(skipForPage(query.page, query.limit))
      .limit(query.limit)
      .lean(),
    Deal.countDocuments(filter),
  ]);
  return {
    data: items.map((x) => serialize(x as unknown as IDeal)),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function updateDeal(id: string, data: z.infer<typeof updateDealSchema>, userId: string) {
  const d = (await Deal.findById(id)) as IDeal | null;
  if (!d) throw new AppError(404, "NOT_FOUND", "Deal not found");
  const before = pickCommercialSnapshot(d);
  if (data.ownerId) {
    const { User } = await import("../models/User.js");
    if (!(await User.findById(data.ownerId))) {
      throw new AppError(400, "VALIDATION_ERROR", "ownerId not found");
    }
  }
  if (data.serviceCatalogItemId) {
    const { ServiceCatalogItem } = await import("../models/ServiceCatalogItem.js");
    const exists = await ServiceCatalogItem.findById(data.serviceCatalogItemId);
    if (!exists) throw new AppError(400, "VALIDATION_ERROR", "serviceCatalogItemId not found");
  }
  if (data.name !== undefined) d.name = data.name;
  if (data.stage !== undefined) d.stage = data.stage;
  if (data.expectedValue !== undefined) d.expectedValue = data.expectedValue;
  if (data.winProbability !== undefined) d.winProbability = data.winProbability;
  if (data.closeDate !== undefined) d.closeDate = data.closeDate;
  if (data.leadSource !== undefined) d.leadSource = data.leadSource;
  if (data.lossReason !== undefined) d.lossReason = data.lossReason;
  if (data.competitorTags !== undefined) d.competitorTags = data.competitorTags;
  if (data.ownerId !== undefined) d.ownerId = data.ownerId ? parseObjectId(data.ownerId, "ownerId") : undefined;
  if (data.serviceCatalogItemId !== undefined) {
    d.serviceCatalogItemId = data.serviceCatalogItemId
      ? parseObjectId(data.serviceCatalogItemId, "serviceCatalogItemId")
      : undefined;
  }
  await d.save();
  await logCommercialChange({
    entityType: "Deal",
    entityId: d._id.toString(),
    action: "update",
    changes: { before, after: pickCommercialSnapshot(d) },
    performedBy: userId,
  });
  return serialize(d);
}

export async function deleteDeal(id: string, userId: string) {
  const d = await Deal.findById(id);
  if (!d) throw new AppError(404, "NOT_FOUND", "Deal not found");
  await logCommercialChange({
    entityType: "Deal",
    entityId: d._id.toString(),
    action: "delete",
    changes: { before: pickCommercialSnapshot(d) },
    performedBy: userId,
  });
  await Deal.findByIdAndDelete(id);
}
