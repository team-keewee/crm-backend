import mongoose from "mongoose";
import { AuditLog } from "../models/AuditLog.js";
import { skipForPage } from "../utils/pagination.js";

export async function logCommercialChange(params: {
  entityType: string;
  entityId: string;
  action: "create" | "update" | "delete";
  changes: Record<string, unknown>;
  performedBy: string;
}): Promise<void> {
  await AuditLog.create({
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    changes: params.changes,
    performedBy: new mongoose.Types.ObjectId(params.performedBy),
  });
}

export async function listAuditLogs(params: {
  entityType?: string;
  entityId?: string;
  page: number;
  limit: number;
}) {
  const q: Record<string, unknown> = {};
  if (params.entityType) q.entityType = params.entityType;
  if (params.entityId) q.entityId = params.entityId;
  const [items, total] = await Promise.all([
    AuditLog.find(q)
      .sort({ createdAt: -1 })
      .skip(skipForPage(params.page, params.limit))
      .limit(params.limit)
      .lean(),
    AuditLog.countDocuments(q),
  ]);
  return {
    data: items.map((x) => ({
      id: x._id.toString(),
      entityType: x.entityType,
      entityId: x.entityId,
      action: x.action,
      changes: x.changes,
      performedBy: x.performedBy.toString(),
      createdAt: x.createdAt,
    })),
    total,
    page: params.page,
    limit: params.limit,
  };
}
