import { z } from "zod";
import { ServiceCatalogItem, type IServiceCatalogItem } from "../models/ServiceCatalogItem.js";
import { AppError } from "../utils/AppError.js";
import { paginationQuerySchema, skipForPage, parseSort } from "../utils/pagination.js";

export const createServiceCatalogItemSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  active: z.boolean().optional(),
});

export const updateServiceCatalogItemSchema = createServiceCatalogItemSchema.partial().strict();

const listQuerySchema = paginationQuerySchema.extend({
  active: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export { listQuerySchema as serviceCatalogListQuerySchema };

function serialize(s: IServiceCatalogItem) {
  return {
    id: s._id.toString(),
    name: s.name,
    slug: s.slug,
    description: s.description,
    active: s.active,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export async function createServiceCatalogItem(data: z.infer<typeof createServiceCatalogItemSchema>) {
  const existing = await ServiceCatalogItem.findOne({ slug: data.slug.toLowerCase().trim() });
  if (existing) {
    throw new AppError(409, "CONFLICT", "Service with this slug already exists");
  }
  const s = (await ServiceCatalogItem.create({
    name: data.name,
    slug: data.slug.toLowerCase().trim(),
    description: data.description,
    active: data.active ?? true,
  })) as IServiceCatalogItem;
  return serialize(s);
}

export async function getServiceCatalogItem(id: string) {
  const s = await ServiceCatalogItem.findById(id);
  if (!s) throw new AppError(404, "NOT_FOUND", "Service catalog item not found");
  return serialize(s);
}

export async function listServiceCatalogItems(query: z.infer<typeof listQuerySchema>) {
  const filter: Record<string, unknown> = {};
  if (query.active !== undefined) filter.active = query.active;
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { slug: { $regex: query.search, $options: "i" } },
    ];
  }
  const sort = parseSort(query.sort, ["name", "slug", "createdAt"]) ?? { name: 1 as const };
  const [items, total] = await Promise.all([
    ServiceCatalogItem.find(filter)
      .sort(sort)
      .skip(skipForPage(query.page, query.limit))
      .limit(query.limit)
      .lean(),
    ServiceCatalogItem.countDocuments(filter),
  ]);
  return {
    data: items.map((x) => serialize(x as unknown as IServiceCatalogItem)),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function updateServiceCatalogItem(
  id: string,
  data: z.infer<typeof updateServiceCatalogItemSchema>
) {
  const s = (await ServiceCatalogItem.findById(id)) as IServiceCatalogItem | null;
  if (!s) throw new AppError(404, "NOT_FOUND", "Service catalog item not found");
  if (data.slug) {
    const dup = await ServiceCatalogItem.findOne({ slug: data.slug.toLowerCase().trim(), _id: { $ne: s._id } });
    if (dup) throw new AppError(409, "CONFLICT", "Service with this slug already exists");
  }
  if (data.name !== undefined) s.name = data.name;
  if (data.slug !== undefined) s.slug = data.slug.toLowerCase().trim();
  if (data.description !== undefined) s.description = data.description;
  if (data.active !== undefined) s.active = data.active;
  await s.save();
  return serialize(s);
}

export async function deleteServiceCatalogItem(id: string) {
  const s = await ServiceCatalogItem.findByIdAndDelete(id);
  if (!s) throw new AppError(404, "NOT_FOUND", "Service catalog item not found");
}
