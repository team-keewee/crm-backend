import { z } from "zod";
import { Account, type IAccount, type IAddress } from "../models/Account.js";
import { Contact } from "../models/Contact.js";
import { Deal } from "../models/Deal.js";
import { Engagement } from "../models/Engagement.js";
import { Project } from "../models/Project.js";
import { AppError } from "../utils/AppError.js";
import { parseObjectId } from "../utils/id.js";
import { paginationQuerySchema, skipForPage, parseSort } from "../utils/pagination.js";
import { logCommercialChange } from "./auditService.js";

const addressSchema = z
  .object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  })
  .optional();

export const createAccountSchema = z.object({
  legalName: z.string().min(1),
  displayName: z.string().min(1),
  parentAccountId: z.string().optional(),
  status: z.enum(["prospect", "active", "paused", "churned"]).optional(),
  healthTags: z.array(z.string()).optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  sizeBand: z.string().optional(),
  timezone: z.string().optional(),
  companyAddress: addressSchema,
  taxVatId: z.string().optional(),
  ownerId: z.string().optional(),
});

export const updateAccountSchema = createAccountSchema.partial().strict();

const listQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["prospect", "active", "paused", "churned"]).optional(),
  ownerId: z.string().optional(),
  parentAccountId: z.string().optional(),
  search: z.string().optional(),
});

export { listQuerySchema as accountListQuerySchema };

function serialize(a: IAccount) {
  return {
    id: a._id.toString(),
    legalName: a.legalName,
    displayName: a.displayName,
    parentAccountId: a.parentAccountId?.toString(),
    status: a.status,
    healthTags: a.healthTags,
    website: a.website,
    industry: a.industry,
    sizeBand: a.sizeBand,
    timezone: a.timezone,
    companyAddress: a.companyAddress as IAddress | undefined,
    taxVatId: a.taxVatId,
    ownerId: a.ownerId?.toString(),
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

const commercialFields: (keyof IAccount)[] = [
  "legalName",
  "displayName",
  "status",
  "healthTags",
  "taxVatId",
  "ownerId",
  "sizeBand",
];

function pickCommercialSnapshot(a: IAccount) {
  const o: Record<string, unknown> = {};
  for (const k of commercialFields) {
    o[k] = a[k] as unknown;
  }
  return o;
}

export async function createAccount(
  data: z.infer<typeof createAccountSchema>,
  userId: string
) {
  if (data.parentAccountId) {
    const p = await Account.findById(data.parentAccountId);
    if (!p) throw new AppError(400, "VALIDATION_ERROR", "parentAccountId not found");
  }
  if (data.ownerId) {
    const { User } = await import("../models/User.js");
    const o = await User.findById(data.ownerId);
    if (!o) throw new AppError(400, "VALIDATION_ERROR", "ownerId not found");
  }
  const doc = (await Account.create({
    legalName: data.legalName,
    displayName: data.displayName,
    parentAccountId: data.parentAccountId ? parseObjectId(data.parentAccountId, "parentAccountId") : undefined,
    status: data.status ?? "prospect",
    healthTags: data.healthTags ?? [],
    website: data.website,
    industry: data.industry,
    sizeBand: data.sizeBand,
    timezone: data.timezone,
    companyAddress: data.companyAddress,
    taxVatId: data.taxVatId,
    ownerId: data.ownerId ? parseObjectId(data.ownerId, "ownerId") : undefined,
  })) as IAccount;
  await logCommercialChange({
    entityType: "Account",
    entityId: doc._id.toString(),
    action: "create",
    changes: { after: pickCommercialSnapshot(doc) },
    performedBy: userId,
  });
  return serialize(doc);
}

export async function getAccount(id: string) {
  const a = await Account.findById(id);
  if (!a) throw new AppError(404, "NOT_FOUND", "Account not found");
  return serialize(a);
}

export async function listAccounts(query: z.infer<typeof listQuerySchema>) {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.ownerId) filter.ownerId = parseObjectId(query.ownerId, "ownerId");
  if (query.parentAccountId) {
    filter.parentAccountId = parseObjectId(query.parentAccountId, "parentAccountId");
  }
  if (query.search) {
    filter.$or = [
      { displayName: { $regex: query.search, $options: "i" } },
      { legalName: { $regex: query.search, $options: "i" } },
    ];
  }
  const sort = parseSort(query.sort, ["displayName", "legalName", "createdAt", "status"]) ?? {
    createdAt: -1 as const,
  };
  const [items, total] = await Promise.all([
    Account.find(filter)
      .sort(sort)
      .skip(skipForPage(query.page, query.limit))
      .limit(query.limit)
      .lean(),
    Account.countDocuments(filter),
  ]);
  return {
    data: items.map((x) => serialize(x as unknown as IAccount)),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function updateAccount(id: string, data: z.infer<typeof updateAccountSchema>, userId: string) {
  const a = await Account.findById(id);
  if (!a) throw new AppError(404, "NOT_FOUND", "Account not found");
  const before = pickCommercialSnapshot(a);

  if (data.parentAccountId !== undefined) {
    if (data.parentAccountId === id) {
      throw new AppError(400, "VALIDATION_ERROR", "Account cannot be its own parent");
    }
    const p = await Account.findById(data.parentAccountId);
    if (!p) throw new AppError(400, "VALIDATION_ERROR", "parentAccountId not found");
    a.parentAccountId = parseObjectId(data.parentAccountId, "parentAccountId");
  }
  if (data.legalName !== undefined) a.legalName = data.legalName;
  if (data.displayName !== undefined) a.displayName = data.displayName;
  if (data.status !== undefined) a.status = data.status;
  if (data.healthTags !== undefined) a.healthTags = data.healthTags;
  if (data.website !== undefined) a.website = data.website;
  if (data.industry !== undefined) a.industry = data.industry;
  if (data.sizeBand !== undefined) a.sizeBand = data.sizeBand;
  if (data.timezone !== undefined) a.timezone = data.timezone;
  if (data.companyAddress !== undefined) a.companyAddress = data.companyAddress;
  if (data.taxVatId !== undefined) a.taxVatId = data.taxVatId;
  if (data.ownerId !== undefined) {
    a.ownerId = data.ownerId ? parseObjectId(data.ownerId, "ownerId") : undefined;
  }

  await a.save();
  const after = pickCommercialSnapshot(a);
  await logCommercialChange({
    entityType: "Account",
    entityId: a._id.toString(),
    action: "update",
    changes: { before, after },
    performedBy: userId,
  });
  return serialize(a);
}

export async function deleteAccount(id: string, performedBy: string) {
  const a = await Account.findById(id);
  if (!a) throw new AppError(404, "NOT_FOUND", "Account not found");
  const childAccount = await Account.countDocuments({ parentAccountId: a._id });
  if (childAccount > 0) {
    throw new AppError(400, "CONFLICT", "Reassign or delete child accounts first");
  }
  const [contacts, deals, engagements, projects] = await Promise.all([
    Contact.countDocuments({ accountId: a._id }),
    Deal.countDocuments({ accountId: a._id }),
    Engagement.countDocuments({ accountId: a._id }),
    Project.countDocuments({ accountId: a._id }),
  ]);
  if (contacts + deals + engagements + projects > 0) {
    throw new AppError(400, "CONFLICT", "Remove or reassign related records before deleting this account");
  }
  await logCommercialChange({
    entityType: "Account",
    entityId: a._id.toString(),
    action: "delete",
    changes: { before: pickCommercialSnapshot(a) },
    performedBy,
  });
  await Account.findByIdAndDelete(id);
}
