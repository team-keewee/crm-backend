import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function skipForPage(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function parseSort(sort: string | undefined, allowed: string[]): Record<string, 1 | -1> | undefined {
  if (!sort) return undefined;
  const dir = sort.startsWith("-") ? -1 : 1;
  const key = sort.replace(/^-/, "");
  if (!allowed.includes(key)) return undefined;
  return { [key]: dir } as Record<string, 1 | -1>;
}
