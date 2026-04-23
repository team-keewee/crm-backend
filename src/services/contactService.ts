import { z } from "zod";
import mongoose from "mongoose";
import { Contact, type IContact } from "../models/Contact.js";
import { Account } from "../models/Account.js";
import { AppError } from "../utils/AppError.js";
import { parseObjectId } from "../utils/id.js";
import { paginationQuerySchema, skipForPage, parseSort } from "../utils/pagination.js";

export const createContactSchema = z.object({
  accountId: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  roles: z.array(z.string()).optional(),
  isPrimary: z.boolean().optional(),
  doNotEmail: z.boolean().optional(),
});

export const updateContactSchema = createContactSchema.omit({ accountId: true }).partial().strict();

const listQuerySchema = paginationQuerySchema.extend({
  accountId: z.string(),
  search: z.string().optional(),
});

export { listQuerySchema as contactListQuerySchema };

function serialize(c: IContact) {
  return {
    id: c._id.toString(),
    accountId: c.accountId.toString(),
    name: c.name,
    email: c.email,
    roles: c.roles,
    isPrimary: c.isPrimary,
    doNotEmail: c.doNotEmail,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

async function ensureSinglePrimary(accountId: mongoose.Types.ObjectId, exceptContactId?: string) {
  await Contact.updateMany(
    { accountId, ...(exceptContactId ? { _id: { $ne: exceptContactId } } : {}) },
    { $set: { isPrimary: false } }
  );
}

export async function createContact(data: z.infer<typeof createContactSchema>) {
  const acc = await Account.findById(data.accountId);
  if (!acc) throw new AppError(400, "VALIDATION_ERROR", "accountId not found");
  const accountOid = parseObjectId(data.accountId, "accountId");
  if (data.isPrimary) {
    await ensureSinglePrimary(accountOid);
  }
  const doc = await Contact.create({
    accountId: accountOid,
    name: data.name,
    email: data.email,
    roles: data.roles ?? [],
    isPrimary: data.isPrimary ?? false,
    doNotEmail: data.doNotEmail ?? false,
  });
  return serialize(doc);
}

export async function getContact(id: string) {
  const c = await Contact.findById(id);
  if (!c) throw new AppError(404, "NOT_FOUND", "Contact not found");
  return serialize(c);
}

export async function listContacts(query: z.infer<typeof listQuerySchema>) {
  const accountOid = parseObjectId(query.accountId, "accountId");
  const filter: Record<string, unknown> = { accountId: accountOid };
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { email: { $regex: query.search, $options: "i" } },
    ];
  }
  const sort = parseSort(query.sort, ["name", "email", "createdAt"]) ?? { name: 1 as const };
  const [items, total] = await Promise.all([
    Contact.find(filter)
      .sort(sort)
      .skip(skipForPage(query.page, query.limit))
      .limit(query.limit)
      .lean(),
    Contact.countDocuments(filter),
  ]);
  return {
    data: items.map((x) => serialize(x as unknown as IContact)),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function updateContact(id: string, data: z.infer<typeof updateContactSchema>) {
  const c = await Contact.findById(id);
  if (!c) throw new AppError(404, "NOT_FOUND", "Contact not found");
  if (data.isPrimary) {
    await ensureSinglePrimary(c.accountId, id);
  }
  if (data.name !== undefined) c.name = data.name;
  if (data.email !== undefined) c.email = data.email;
  if (data.roles !== undefined) c.roles = data.roles;
  if (data.isPrimary !== undefined) c.isPrimary = data.isPrimary;
  if (data.doNotEmail !== undefined) c.doNotEmail = data.doNotEmail;
  await c.save();
  return serialize(c);
}

export async function deleteContact(id: string) {
  const c = await Contact.findByIdAndDelete(id);
  if (!c) throw new AppError(404, "NOT_FOUND", "Contact not found");
}
