import { z } from "zod";
import { Deal } from "../models/Deal.js";
import { Task } from "../models/Task.js";
import { Account } from "../models/Account.js";
import { Activity } from "../models/Activity.js";
import { Engagement } from "../models/Engagement.js";
import { parseObjectId } from "../utils/id.js";
import { AppError } from "../utils/AppError.js";

export const dashboardQuerySchema = z.object({
  atRiskNoActivityDays: z.coerce.number().int().min(1).default(14),
  atRiskEngagementEndDays: z.coerce.number().int().min(1).default(30),
  accountId: z.string().optional(),
});

export interface DashboardSummary {
  dealPipeline: Array<{ stage: string; count: number; expectedValue: number }>;
  openTasksByAssignee: Array<{ assigneeId: string | null; count: number }>;
  atRiskAccountsWithNoActivity: Array<{
    accountId: string;
    displayName: string;
    legalName: string;
  }>;
  engagementsEndingSoon: Array<Record<string, unknown>>;
}

export async function getDashboardSummary(
  query: z.infer<typeof dashboardQuerySchema>
): Promise<DashboardSummary> {
  const accountFilter = query.accountId
    ? { _id: parseObjectId(query.accountId, "accountId") }
    : {};

  if (query.accountId) {
    const acc = await Account.findById(query.accountId);
    if (!acc) throw new AppError(400, "VALIDATION_ERROR", "accountId not found");
  }

  const [dealStages, taskAssignees, accountsNoActivity, engagementsSoon] = await Promise.all([
    Deal.aggregate([
      { $match: accountFilter._id ? { accountId: accountFilter._id } : {} },
      { $group: { _id: "$stage", count: { $sum: 1 }, value: { $sum: "$expectedValue" } } },
    ]),
    Task.aggregate([
      {
        $match: {
          status: { $in: ["backlog", "in_progress", "review"] },
          projectId: { $exists: true },
        },
      },
      {
        $lookup: {
          from: "projects",
          localField: "projectId",
          foreignField: "_id",
          as: "project",
        },
      },
      { $unwind: "$project" },
      ...(query.accountId
        ? [
            {
              $match: {
                "project.accountId": parseObjectId(query.accountId, "accountId"),
              },
            },
          ]
        : []),
      {
        $group: {
          _id: "$assigneeId",
          count: { $sum: 1 },
        },
      },
    ]),
    getAccountsWithNoActivity(query.atRiskNoActivityDays, accountFilter),
    getEngagementsEndingSoon(query.atRiskEngagementEndDays, accountFilter),
  ]);

  return {
    dealPipeline: dealStages.map((d) => ({
      stage: String(d._id),
      count: d.count,
      expectedValue: d.value,
    })),
    openTasksByAssignee: taskAssignees.map((t) => ({
      assigneeId: t._id == null ? null : String(t._id),
      count: t.count,
    })),
    atRiskAccountsWithNoActivity: accountsNoActivity,
    engagementsEndingSoon: engagementsSoon as Array<Record<string, unknown>>,
  };
}

async function getAccountsWithNoActivity(
  days: number,
  accountFilter: { _id?: ReturnType<typeof parseObjectId> }
) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const match: Record<string, unknown> = accountFilter._id
    ? { _id: accountFilter._id }
    : { status: { $in: ["prospect", "active"] } };

  const accounts = await Account.find(match, { _id: 1, displayName: 1, legalName: 1 });
  if (accounts.length === 0) return [];

  const ids = accounts.map((a) => a._id);
  const recent = await Activity.aggregate([
    { $match: { accountId: { $in: ids }, occurredAt: { $gte: since } } },
    { $group: { _id: "$accountId" } },
  ]);
  const activeIds = new Set(recent.map((r) => r._id.toString()));

  return accounts
    .filter((a) => !activeIds.has(a._id.toString()))
    .map((a) => ({ accountId: a._id.toString(), displayName: a.displayName, legalName: a.legalName }));
}

async function getEngagementsEndingSoon(
  withinDays: number,
  accountFilter: { _id?: ReturnType<typeof parseObjectId> }
) {
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + withinDays);

  const q: Record<string, unknown> = {
    endDate: { $gte: from, $lte: to },
  };
  if (accountFilter._id) {
    q.accountId = accountFilter._id;
  }
  return Engagement.find(q)
    .select("accountId endDate value documentName model")
    .lean();
}
