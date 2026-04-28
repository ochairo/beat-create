export type TaskId = string;
export type UserId = string;
export type ColumnId = "backlog" | "todo" | "in-progress" | "review" | "done";
export type Priority = "critical" | "high" | "medium" | "low";
export type TaskType = "feature" | "bug" | "chore" | "epic";

export interface User {
  readonly id: UserId;
  readonly name: string;
  readonly email: string;
  readonly avatarColor: string;
  readonly role: "admin" | "member" | "viewer";
}

export interface Task {
  readonly id: TaskId;
  readonly displayId: string;
  readonly projectId: string;
  readonly sprintId: string | null;
  readonly assigneeId: UserId | null;
  readonly assigneeName: string | null;
  title: string;
  description: string;
  priority: Priority;
  type: TaskType;
  storyPoints: number;
  columnId: ColumnId;
  startDate: string | null;
  endDate: string | null;
  tags: readonly string[];
}
