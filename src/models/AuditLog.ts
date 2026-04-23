import mongoose, { Schema, type Document } from "mongoose";

export interface IAuditLog extends Document {
  entityType: string;
  entityId: string;
  action: "create" | "update" | "delete";
  changes: Record<string, unknown>;
  performedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    action: { type: String, enum: ["create", "update", "delete"], required: true },
    changes: { type: Schema.Types.Mixed, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
