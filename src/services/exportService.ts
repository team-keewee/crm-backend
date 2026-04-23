import { Account } from "../models/Account.js";
import { Deal } from "../models/Deal.js";
import { parseObjectId } from "../utils/id.js";
import { rowsToCsv } from "../utils/csv.js";
import { z } from "zod";

export const accountsExportQuerySchema = z.object({
  status: z.enum(["prospect", "active", "paused", "churned"]).optional(),
  search: z.string().optional(),
});

export const dealsExportQuerySchema = z.object({
  accountId: z.string().optional(),
  stage: z
    .enum(["discovery", "proposal", "negotiation", "won", "lost"])
    .optional(),
});

export async function streamAccountsCsv(query: z.infer<typeof accountsExportQuerySchema>) {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    filter.$or = [
      { displayName: { $regex: query.search, $options: "i" } },
      { legalName: { $regex: query.search, $options: "i" } },
    ];
  }
  const list = await Account.find(filter)
    .sort({ displayName: 1 })
    .lean();

  const headers = [
    "id",
    "legalName",
    "displayName",
    "status",
    "industry",
    "ownerId",
    "healthTags",
  ];
  const rows: string[][] = list.map((a) => [
    a._id.toString(),
    a.legalName,
    a.displayName,
    a.status,
    a.industry ?? "",
    a.ownerId?.toString() ?? "",
    a.healthTags?.join(";") ?? "",
  ]);
  return rowsToCsv(rows, headers);
}

export async function streamDealsCsv(query: z.infer<typeof dealsExportQuerySchema>) {
  const filter: Record<string, unknown> = {};
  if (query.accountId) {
    filter.accountId = parseObjectId(query.accountId, "accountId");
  }
  if (query.stage) filter.stage = query.stage;
  const list = await Deal.find(filter)
    .sort({ closeDate: 1, createdAt: -1 })
    .lean();
  const headers = [
    "id",
    "accountId",
    "name",
    "stage",
    "expectedValue",
    "winProbability",
    "closeDate",
    "leadSource",
  ];
  const rows: string[][] = list.map((d) => [
    d._id.toString(),
    d.accountId.toString(),
    d.name,
    d.stage,
    String(d.expectedValue),
    String(d.winProbability),
    d.closeDate ? d.closeDate.toISOString() : "",
    d.leadSource,
  ]);
  return rowsToCsv(rows, headers);
}
