import type { ColumnId, Priority, TaskType } from "../../domain/types";

// ── Column definitions ─────────────────────────────────────────────────────────

export const COLUMNS: readonly { id: ColumnId; label: string }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "todo", label: "To Do" },
  { id: "in-progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

// ── Color maps ─────────────────────────────────────────────────────────────────

export const PRIORITY_COLOR: Record<Priority, string> = {
  critical: "#f87171",
  high: "#fb923c",
  medium: "#facc15",
  low: "#4ade80",
};

export const TYPE_COLOR: Record<TaskType, string> = {
  epic: "#a78bfa",
  feature: "#60a5fa",
  bug: "#f87171",
  chore: "#94a3b8",
};

export const COLUMN_COLOR: Record<ColumnId, string> = {
  backlog: "#64748b",
  todo: "#3b82f6",
  "in-progress": "#f59e0b",
  review: "#8b5cf6",
  done: "#22c55e",
};

// ── Dropdown option lists ──────────────────────────────────────────────────────

export const PRIORITY_OPTIONS: readonly { label: string; value: string }[] = [
  { label: "critical", value: "critical" },
  { label: "high", value: "high" },
  { label: "medium", value: "medium" },
  { label: "low", value: "low" },
];

export const TYPE_OPTIONS: readonly { label: string; value: string }[] = [
  { label: "feature", value: "feature" },
  { label: "bug", value: "bug" },
  { label: "chore", value: "chore" },
  { label: "epic", value: "epic" },
];

export const COLUMN_OPTIONS = COLUMNS.map((col) => ({
  label: col.label,
  value: col.id,
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

export function userAvatarColor(
  users: readonly { id: string; avatarColor: string }[],
  id: string | null,
): string {
  if (!id) return "#94a3b8";
  return users.find((u) => u.id === id)?.avatarColor ?? "#94a3b8";
}

export function dateToMs(dateStr: string): number {
  return new Date(dateStr).getTime();
}

export function msToDays(ms: number): number {
  return ms / (1000 * 60 * 60 * 24);
}
