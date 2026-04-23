import mongoose, { Schema, type Document } from "mongoose";

export type TaskStatus = "backlog" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface ITask extends Document {
  projectId: mongoose.Types.ObjectId;
  parentTaskId?: mongoose.Types.ObjectId;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  assigneeId?: mongoose.Types.ObjectId;
  dependencyTaskIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    parentTaskId: { type: Schema.Types.ObjectId, ref: "Task" },
    title: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["backlog", "in_progress", "review", "done"],
      default: "backlog",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    dueDate: Date,
    assigneeId: { type: Schema.Types.ObjectId, ref: "User" },
    dependencyTaskIds: [{ type: Schema.Types.ObjectId, ref: "Task" }],
  },
  { timestamps: true }
);

taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ projectId: 1, dueDate: 1 });
taskSchema.index({ assigneeId: 1 });
taskSchema.index({ parentTaskId: 1 });

export const Task = mongoose.model<ITask>("Task", taskSchema);
