import { For, Show, component, onCleanup } from "@ochairo/beat";
import {
  Badge,
  Button,
  CardWrapper,
  Dialog,
  Dropdown,
  Input,
  Loading,
  TextArea,
  TextInput,
} from "@ochairo/beat-ui";
import { pulse, type Pulse } from "@ochairo/pulse";
import type { User } from "../domain/types.ts";
import type { KanbanStore } from "../data/kanban-store.ts";

// ── Domain types ───────────────────────────────────────────────────────────────

type TaskId = string;
type ColumnId = "backlog" | "todo" | "in-progress" | "review" | "done";
type Priority = "critical" | "high" | "medium" | "low";
type TaskType = "feature" | "bug" | "chore" | "epic";

interface Task {
  readonly id: TaskId;
  readonly displayId: string;
  readonly projectId: string;
  readonly sprintId: string | null;
  readonly assigneeId: string | null;
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

// ── Columns ────────────────────────────────────────────────────────────────────

const COLUMNS: readonly { id: ColumnId; label: string }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "todo", label: "To Do" },
  { id: "in-progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

const formDateInputStyle = [
  "width:100%",
  "box-sizing:border-box",
  "min-height:2.75rem",
  "padding:0.75rem 0.875rem",
  "border-radius:0.875rem",
  "border:1px solid var(--beat-ui-color-border)",
  "background:var(--beat-ui-color-input)",
  "color:var(--beat-ui-color-text)",
  "font:inherit",
  "outline:none",
].join(";");

// ── Helpers ────────────────────────────────────────────────────────────────────

function dateToMs(dateStr: string): number {
  return new Date(dateStr).getTime();
}

function msToDays(ms: number): number {
  return ms / (1000 * 60 * 60 * 24);
}

// ── Colors ─────────────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<Priority, string> = {
  critical: "#f87171",
  high: "#fb923c",
  medium: "#facc15",
  low: "#4ade80",
};

const TYPE_COLOR: Record<TaskType, string> = {
  epic: "#a78bfa",
  feature: "#60a5fa",
  bug: "#f87171",
  chore: "#94a3b8",
};

const COLUMN_COLOR: Record<ColumnId, string> = {
  backlog: "#64748b",
  todo: "#3b82f6",
  "in-progress": "#f59e0b",
  review: "#8b5cf6",
  done: "#22c55e",
};

const PRIORITY_OPTIONS: readonly { label: string; value: string }[] = [
  { label: "critical", value: "critical" },
  { label: "high", value: "high" },
  { label: "medium", value: "medium" },
  { label: "low", value: "low" },
];

const TYPE_OPTIONS: readonly { label: string; value: string }[] = [
  { label: "feature", value: "feature" },
  { label: "bug", value: "bug" },
  { label: "chore", value: "chore" },
  { label: "epic", value: "epic" },
];

const COLUMN_OPTIONS = COLUMNS.map((col) => ({
  label: col.label,
  value: col.id,
}));

function userAvatarColor(users: readonly User[], id: string | null): string {
  if (!id) return "#94a3b8";
  return users.find((u) => u.id === id)?.avatarColor ?? "#94a3b8";
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const pageStyle = [
  "display:flex",
  "flex-direction:column",
  "height:100%",
  "overflow:hidden",
  "background:var(--beat-ui-color-background)",
  "color:var(--beat-ui-color-text)",
  "box-sizing:border-box",
].join(";");

const headerStyle = [
  "display:flex",
  "align-items:center",
  "justify-content:space-between",
  "padding:1rem 1.5rem 0.75rem",
  "border-bottom:1px solid var(--beat-ui-color-border)",
  "flex-shrink:0",
  "gap:1rem",
  "flex-wrap:wrap",
].join(";");

const tabBarStyle = [
  "display:flex",
  "gap:0.25rem",
  "padding:0 1.5rem",
  "border-bottom:1px solid var(--beat-ui-color-border)",
  "flex-shrink:0",
  "background:var(--beat-ui-color-background-subtle)",
].join(";");

function tabStyle(active: boolean): string {
  return [
    "padding:0.6rem 1.25rem",
    "font-size:0.875rem",
    "font-weight:600",
    "cursor:pointer",
    "border:none",
    "background:transparent",
    "color:" +
      (active
        ? "var(--beat-ui-color-primary)"
        : "var(--beat-ui-color-text-muted)"),
    "border-bottom:" +
      (active
        ? "2px solid var(--beat-ui-color-primary)"
        : "2px solid transparent"),
    "transition:color 0.15s,border-color 0.15s",
    "margin-bottom:-1px",
    "white-space:nowrap",
  ].join(";");
}

const boardWrapStyle = [
  "display:flex",
  "gap:0.75rem",
  "padding:1rem 1.5rem",
  "overflow-x:auto",
  "overflow-y:hidden",
  "flex:1",
  "align-items:stretch",
].join(";");

const columnStyle = [
  "display:flex",
  "flex-direction:column",
  "min-width:13rem",
  "flex:1",
  "background:var(--beat-ui-color-background-subtle)",
  "border:1px solid var(--beat-ui-color-border)",
  "border-radius:0.75rem",
  "overflow:hidden",
  "height:100%",
].join(";");

function columnHeaderStyle(colId: ColumnId): string {
  return [
    "display:flex",
    "align-items:center",
    "justify-content:space-between",
    "padding:0.625rem 0.875rem",
    `border-top:3px solid ${COLUMN_COLOR[colId]}`,
    "background:var(--beat-ui-color-background-elevated)",
  ].join(";");
}

function columnDropTargetStyle(isDraggingOver: boolean): string {
  return [
    "display:flex",
    "flex-direction:column",
    "gap:0.5rem",
    "padding:0.5rem",
    "min-height:8rem",
    "flex:1",
    "overflow-y:auto",
    "transition:background 0.15s",
    isDraggingOver
      ? "background:rgba(99,102,241,0.08)"
      : "background:transparent",
  ].join(";");
}

const formLabelStyle = [
  "font-size:0.75rem",
  "font-weight:600",
  "color:var(--beat-ui-color-text-muted)",
  "text-transform:uppercase",
  "letter-spacing:0.05em",
].join(";");

const formRowStyle = [
  "display:flex",
  "flex-direction:column",
  "gap:0.375rem",
].join(";");

const formGridStyle = [
  "display:grid",
  "grid-template-columns:1fr 1fr",
  "gap:0.75rem",
].join(";");

// ── Gantt helpers ──────────────────────────────────────────────────────────────

type GanttZoom = "month" | "week" | "day";

const GANTT_ROW_H = 36;
const GANTT_LABEL_W = 200;

function ganttDayWidth(zoom: GanttZoom): number {
  if (zoom === "month") return 8;
  if (zoom === "week") return 24;
  return 48;
}

interface GanttRange {
  startMs: number;
  days: number;
}

function buildGanttRange(tasks: readonly Task[]): GanttRange {
  const now = Date.now();
  const datedTasks = tasks.filter((t) => t.startDate && t.endDate);
  if (datedTasks.length === 0) return { startMs: now, days: 30 };
  const starts = datedTasks.map((t) => dateToMs(t.startDate!));
  const ends = datedTasks.map((t) => dateToMs(t.endDate!));
  const minMs = Math.min(...starts);
  const maxMs = Math.max(...ends);
  const padding = 3 * 24 * 60 * 60 * 1000;
  const days = Math.ceil(msToDays(maxMs - minMs)) + 6;
  return { startMs: minMs - padding, days };
}

function dateLabels(
  range: GanttRange,
  zoom: GanttZoom,
  dayW: number,
): Array<{ label: string; x: number }> {
  const labels: Array<{ label: string; x: number }> = [];
  const DAY_MS = 24 * 60 * 60 * 1000;
  for (let d = 0; d < range.days; d++) {
    const ms = range.startMs + d * DAY_MS;
    const date = new Date(ms);
    let show = false;
    let label = "";
    if (zoom === "month") {
      if (date.getDate() === 1 || d === 0) {
        show = true;
        label = date.toLocaleDateString(undefined, {
          month: "short",
          year: "2-digit",
        });
      }
    } else if (zoom === "week") {
      if (date.getDay() === 1 || d === 0) {
        show = true;
        label = date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });
      }
    } else {
      show = true;
      label = date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    }
    if (show) {
      labels.push({ label, x: d * dayW });
    }
  }
  return labels;
}

// ── Task detail modal ──────────────────────────────────────────────────────────

interface TaskDetailModalProps {
  readonly task: Task;
  readonly users: readonly User[];
  readonly onClose: () => void;
  readonly onSave: (
    id: TaskId,
    patch: {
      title: string;
      description: string;
      assigneeId: string | null;
      priority: Priority;
      type: TaskType;
      storyPoints: number;
      columnId: ColumnId;
      startDate: string | null;
      endDate: string | null;
      tags: readonly string[];
    },
  ) => void;
  readonly onDelete: (id: TaskId) => void;
}

const TaskDetailModal = component<TaskDetailModalProps>((props) => {
  const titlePulse = pulse(props.task.title);
  const descPulse = pulse(props.task.description);
  const assigneeIdPulse = pulse<string>(props.task.assigneeId ?? "");
  const priorityPulse = pulse<string>(props.task.priority);
  const typePulse = pulse<string>(props.task.type);
  const spPulse = pulse(String(props.task.storyPoints));
  const startDatePulse = pulse(props.task.startDate ?? "");
  const endDatePulse = pulse(props.task.endDate ?? "");
  const columnIdPulse = pulse<string>(props.task.columnId);
  const tagsPulse = pulse(props.task.tags.join(", "));

  const assigneeOptions = [
    { label: "Unassigned", value: "" },
    ...props.users.map((u) => ({ label: u.name, value: u.id })),
  ];

  function handleSave(): void {
    props.onSave(props.task.id, {
      title: titlePulse.get(),
      description: descPulse.get(),
      assigneeId: assigneeIdPulse.get() || null,
      priority: priorityPulse.get() as Priority,
      type: typePulse.get() as TaskType,
      storyPoints: parseInt(spPulse.get(), 10) || props.task.storyPoints,
      startDate: startDatePulse.get() || null,
      endDate: endDatePulse.get() || null,
      columnId: columnIdPulse.get() as ColumnId,
      tags: tagsPulse
        .get()
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
  }

  return (
    <Dialog
      defaultOpen={true}
      closeLabel="×"
      onOpenChange={(isOpen) => {
        if (!isOpen) props.onClose();
      }}
      title={
        <div style="display:flex;align-items:center;gap:0.625rem">
          <Badge color={TYPE_COLOR[props.task.type as TaskType]}>
            {props.task.type.toUpperCase()}
          </Badge>
          <span style="font-size:0.8rem;color:var(--beat-ui-color-text-muted);font-family:monospace">
            {props.task.displayId}
          </span>
        </div>
      }
      footer={
        <div style="display:flex;justify-content:space-between;align-items:center;width:100%">
          <Button
            tone="danger"
            appearance="ghost"
            onPress={() => props.onDelete(props.task.id)}
          >
            Delete task
          </Button>
          <div style="display:flex;gap:0.5rem">
            <Button appearance="ghost" onPress={() => props.onClose()}>
              Cancel
            </Button>
            <Button tone="primary" onPress={() => handleSave()}>
              Save
            </Button>
          </div>
        </div>
      }
    >
      <div style="display:flex;flex-direction:column;gap:0.75rem">
        <div style={formRowStyle}>
          <label style={formLabelStyle}>Title</label>
          <TextInput value={titlePulse} />
        </div>

        <div style={formRowStyle}>
          <label style={formLabelStyle}>Description</label>
          <TextArea value={descPulse} rows={3} />
        </div>

        <div style={formGridStyle}>
          <div style={formRowStyle}>
            <label style={formLabelStyle}>Assignee</label>
            <Dropdown value={assigneeIdPulse} options={assigneeOptions} />
          </div>

          <div style={formRowStyle}>
            <label style={formLabelStyle}>Priority</label>
            <Dropdown value={priorityPulse} options={PRIORITY_OPTIONS} />
          </div>

          <div style={formRowStyle}>
            <label style={formLabelStyle}>Type</label>
            <Dropdown value={typePulse} options={TYPE_OPTIONS} />
          </div>

          <div style={formRowStyle}>
            <label style={formLabelStyle}>Story Points</label>
            <Input type="number" value={spPulse} />
          </div>

          <div style={formRowStyle}>
            <label style={formLabelStyle}>Start Date</label>
            <input
              type="date"
              style={formDateInputStyle}
              value={startDatePulse.get()}
              onInput={(e: Event) => {
                startDatePulse.set((e.currentTarget as HTMLInputElement).value);
              }}
            />
          </div>

          <div style={formRowStyle}>
            <label style={formLabelStyle}>End Date</label>
            <input
              type="date"
              style={formDateInputStyle}
              value={endDatePulse.get()}
              onInput={(e: Event) => {
                endDatePulse.set((e.currentTarget as HTMLInputElement).value);
              }}
            />
          </div>
        </div>

        <div style={formRowStyle}>
          <label style={formLabelStyle}>Column</label>
          <Dropdown value={columnIdPulse} options={COLUMN_OPTIONS} />
        </div>

        <div style={formRowStyle}>
          <label style={formLabelStyle}>Tags (comma separated)</label>
          <TextInput value={tagsPulse} placeholder="frontend, backend…" />
        </div>
      </div>
    </Dialog>
  );
});

// ── New task modal ─────────────────────────────────────────────────────────────

interface NewTaskModalProps {
  readonly defaultColumnId: ColumnId;
  readonly users: readonly User[];
  readonly onClose: () => void;
  readonly onCreate: (input: {
    title: string;
    description: string;
    assigneeId: string | null;
    priority: Priority;
    type: TaskType;
    storyPoints: number;
    columnId: ColumnId;
    startDate: string | null;
    endDate: string | null;
    tags: readonly string[];
  }) => void;
}

const NewTaskModal = component<NewTaskModalProps>((props) => {
  const today = new Date().toISOString().split("T")[0] ?? "";
  const nextWeek =
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0] ?? "";

  const titlePulse = pulse("");
  const descPulse = pulse("");
  const assigneeIdPulse = pulse<string>(props.users[0]?.id ?? "");
  const priorityPulse = pulse<string>("medium");
  const typePulse = pulse<string>("feature");
  const spPulse = pulse("3");
  const startDatePulse = pulse(today);
  const endDatePulse = pulse(nextWeek);
  const columnIdPulse = pulse<string>(props.defaultColumnId);
  const tagsPulse = pulse("");

  const assigneeOptions = [
    { label: "Unassigned", value: "" },
    ...props.users.map((u) => ({ label: u.name, value: u.id })),
  ];

  function handleCreate(): void {
    const title = titlePulse.get().trim();
    if (!title) return;
    props.onCreate({
      title,
      description: descPulse.get(),
      assigneeId: assigneeIdPulse.get() || null,
      priority: priorityPulse.get() as Priority,
      type: typePulse.get() as TaskType,
      storyPoints: parseInt(spPulse.get(), 10) || 3,
      startDate: startDatePulse.get() || null,
      endDate: endDatePulse.get() || null,
      columnId: columnIdPulse.get() as ColumnId,
      tags: tagsPulse
        .get()
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
  }

  return (
    <Dialog
      defaultOpen={true}
      closeLabel="×"
      title="New Task"
      onOpenChange={(isOpen) => {
        if (!isOpen) props.onClose();
      }}
      footer={
        <>
          <Button appearance="ghost" onPress={() => props.onClose()}>
            Cancel
          </Button>
          <Button tone="primary" onPress={() => handleCreate()}>
            Create
          </Button>
        </>
      }
    >
      <div style="display:flex;flex-direction:column;gap:0.75rem">
        <div style={formRowStyle}>
          <label style={formLabelStyle}>Title *</label>
          <TextInput value={titlePulse} placeholder="Task title…" />
        </div>

        <div style={formRowStyle}>
          <label style={formLabelStyle}>Description</label>
          <TextArea
            value={descPulse}
            placeholder="Optional description…"
            rows={3}
          />
        </div>

        <div style={formGridStyle}>
          <div style={formRowStyle}>
            <label style={formLabelStyle}>Assignee</label>
            <Dropdown value={assigneeIdPulse} options={assigneeOptions} />
          </div>

          <div style={formRowStyle}>
            <label style={formLabelStyle}>Priority</label>
            <Dropdown value={priorityPulse} options={PRIORITY_OPTIONS} />
          </div>

          <div style={formRowStyle}>
            <label style={formLabelStyle}>Type</label>
            <Dropdown value={typePulse} options={TYPE_OPTIONS} />
          </div>

          <div style={formRowStyle}>
            <label style={formLabelStyle}>Story Points</label>
            <Input type="number" value={spPulse} />
          </div>

          <div style={formRowStyle}>
            <label style={formLabelStyle}>Start Date</label>
            <input
              type="date"
              style={formDateInputStyle}
              value={startDatePulse.get()}
              onInput={(e: Event) => {
                startDatePulse.set((e.currentTarget as HTMLInputElement).value);
              }}
            />
          </div>

          <div style={formRowStyle}>
            <label style={formLabelStyle}>End Date</label>
            <input
              type="date"
              style={formDateInputStyle}
              value={endDatePulse.get()}
              onInput={(e: Event) => {
                endDatePulse.set((e.currentTarget as HTMLInputElement).value);
              }}
            />
          </div>
        </div>

        <div style={formRowStyle}>
          <label style={formLabelStyle}>Column</label>
          <Dropdown value={columnIdPulse} options={COLUMN_OPTIONS} />
        </div>

        <div style={formRowStyle}>
          <label style={formLabelStyle}>Tags (comma separated)</label>
          <TextInput value={tagsPulse} placeholder="frontend, backend…" />
        </div>
      </div>
    </Dialog>
  );
});

// ── Board tab ──────────────────────────────────────────────────────────────────

interface BoardTabProps {
  readonly tasks: Pulse<readonly Task[]>;
  readonly users: readonly User[];
  readonly filterAssignee: Pulse<string>;
  readonly filterPriority: Pulse<string>;
  readonly onAddTask: (colId: ColumnId) => void;
  readonly onOpenTask: (task: Task) => void;
  readonly onDropTask: (taskId: TaskId, colId: ColumnId) => void;
}

const BoardTab = component<BoardTabProps>((props) => {
  const draggingId = pulse<TaskId | null>(null);
  const dragOverCol = pulse<ColumnId | null>(null);

  function filteredTasks(colId: ColumnId): readonly Task[] {
    const assigneeId = props.filterAssignee.get();
    const priority = props.filterPriority.get();
    return props.tasks
      .get()
      .filter(
        (t) =>
          t.columnId === colId &&
          (assigneeId === "" || t.assigneeId === assigneeId) &&
          (priority === "" || t.priority === priority),
      );
  }

  function colTasksPulse(colId: ColumnId): Pulse<readonly Task[]> {
    const p = pulse<readonly Task[]>(filteredTasks(colId));
    onCleanup(
      props.tasks.on(() => {
        p.set(filteredTasks(colId));
      }),
    );
    onCleanup(
      props.filterAssignee.on(() => {
        p.set(filteredTasks(colId));
      }),
    );
    onCleanup(
      props.filterPriority.on(() => {
        p.set(filteredTasks(colId));
      }),
    );
    return p;
  }

  return (
    <div style={boardWrapStyle}>
      {COLUMNS.map((col) => {
        const colTasks = colTasksPulse(col.id);
        const colCount = pulse(colTasks.get().length);
        onCleanup(
          colTasks.on(({ currentValue }) => {
            colCount.set(currentValue.length);
          }),
        );
        const isOver = pulse(false);

        onCleanup(
          dragOverCol.on(({ currentValue }) => {
            isOver.set(currentValue === col.id);
          }),
        );

        return (
          <div
            style={columnStyle}
            onDragover={(e: DragEvent) => {
              e.preventDefault();
              dragOverCol.set(col.id);
            }}
            onDragleave={() => {
              if (dragOverCol.get() === col.id) dragOverCol.set(null);
            }}
            onDrop={(e: DragEvent) => {
              e.preventDefault();
              const id = draggingId.get();
              if (id !== null) {
                props.onDropTask(id, col.id);
                draggingId.set(null);
              }
              dragOverCol.set(null);
            }}
          >
            {/* Column header */}
            <div style={columnHeaderStyle(col.id)}>
              <div style="display:flex;align-items:center;gap:0.5rem">
                <span style="font-size:0.8125rem;font-weight:700">
                  {col.label}
                </span>
                <span
                  style={`font-size:0.7rem;font-weight:700;padding:0.15rem 0.5rem;border-radius:999px;background:${COLUMN_COLOR[col.id]}22;color:${COLUMN_COLOR[col.id]}`}
                >
                  {colCount}
                </span>
              </div>
              <button
                style="background:transparent;border:none;cursor:pointer;color:var(--beat-ui-color-text-muted);font-size:1.1rem;line-height:1;padding:0.125rem 0.25rem;border-radius:0.25rem"
                title="Add task"
                onClick={() => props.onAddTask(col.id)}
              >
                +
              </button>
            </div>

            {/* Cards */}
            <div
              __beatStyleBindings={{ background: isOver }}
              style={columnDropTargetStyle(false)}
            >
              <For each={colTasks} key={(t) => t.id}>
                {(taskPulse) => {
                  const isDragging = pulse(false);

                  return (
                    <CardWrapper
                      as="div"
                      style="cursor:grab;user-select:none;transition:box-shadow 0.15s,opacity 0.15s"
                      ref={(el: HTMLElement) => {
                        el.draggable = true;
                        el.addEventListener("dragstart", (e: Event) => {
                          const de = e as DragEvent;
                          const task = taskPulse.get();
                          draggingId.set(task.id);
                          isDragging.set(true);
                          if (de.dataTransfer) {
                            de.dataTransfer.effectAllowed = "move";
                            de.dataTransfer.setData("text/plain", task.id);
                          }
                        });
                        el.addEventListener("dragend", () => {
                          isDragging.set(false);
                          draggingId.set(null);
                        });
                        onCleanup(
                          isDragging.on(({ currentValue }) => {
                            el.style.opacity = currentValue ? "0.45" : "1";
                            el.style.boxShadow = currentValue
                              ? "none"
                              : "0 1px 3px rgba(0,0,0,0.2)";
                          }),
                        );
                      }}
                      onPress={() => props.onOpenTask(taskPulse.get())}
                    >
                      {/* Type + priority row */}
                      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.375rem">
                        <span
                          style={`font-size:0.65rem;font-weight:700;padding:0.15rem 0.5rem;border-radius:999px;background:${TYPE_COLOR[taskPulse.get().type]}22;color:${TYPE_COLOR[taskPulse.get().type]}`}
                        >
                          {taskPulse.get().type}
                        </span>
                        <span
                          style={`width:0.5rem;height:0.5rem;border-radius:50%;background:${PRIORITY_COLOR[taskPulse.get().priority]};display:inline-block;flex-shrink:0`}
                          title={taskPulse.get().priority}
                        />
                      </div>

                      {/* Title */}
                      <div style="font-size:0.8125rem;font-weight:600;line-height:1.35;margin-bottom:0.375rem;color:var(--beat-ui-color-text)">
                        {taskPulse.get().title}
                      </div>

                      {/* Tags */}
                      <div style="display:flex;flex-wrap:wrap;gap:0.25rem;margin-bottom:0.5rem">
                        {taskPulse.get().tags.map((tag) => (
                          <span style="font-size:0.65rem;padding:0.1rem 0.4rem;border-radius:999px;background:var(--beat-ui-color-background-subtle);color:var(--beat-ui-color-text-muted);border:1px solid var(--beat-ui-color-border)">
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Footer: assignee + points */}
                      <div style="display:flex;align-items:center;justify-content:space-between">
                        <div style="display:flex;align-items:center;gap:0.375rem">
                          <span
                            style={`display:inline-flex;align-items:center;justify-content:center;width:1.375rem;height:1.375rem;border-radius:50%;font-size:0.6rem;font-weight:700;color:#fff;background:${userAvatarColor(props.users, taskPulse.get().assigneeId)}`}
                          >
                            {taskPulse.get().assigneeName?.[0] ?? "?"}
                          </span>
                          <span style="font-size:0.7rem;color:var(--beat-ui-color-text-muted)">
                            {taskPulse.get().assigneeName ?? "Unassigned"}
                          </span>
                        </div>
                        <span
                          style="font-size:0.7rem;font-weight:700;color:var(--beat-ui-color-text-muted)"
                          title="Story points"
                        >
                          {taskPulse.get().storyPoints} SP
                        </span>
                      </div>
                    </CardWrapper>
                  );
                }}
              </For>
            </div>
          </div>
        );
      })}
    </div>
  );
});

// ── Gantt tab ──────────────────────────────────────────────────────────────────

interface GanttTabProps {
  readonly tasks: Pulse<readonly Task[]>;
  readonly users: readonly User[];
  readonly filterAssignee: Pulse<string>;
  readonly filterPriority: Pulse<string>;
  readonly onOpenTask: (task: Task) => void;
}

const GanttTab = component<GanttTabProps>((props) => {
  const zoom = pulse<GanttZoom>("week");
  let contentScrollEl: HTMLDivElement | null = null;

  const visibleTasks = pulse<readonly Task[]>(props.tasks.get());
  function recompute(): void {
    const assigneeId = props.filterAssignee.get();
    const priority = props.filterPriority.get();
    visibleTasks.set(
      props.tasks
        .get()
        .filter(
          (t) =>
            (assigneeId === "" || t.assigneeId === assigneeId) &&
            (priority === "" || t.priority === priority),
        ),
    );
  }
  onCleanup(props.tasks.on(() => recompute()));
  onCleanup(props.filterAssignee.on(() => recompute()));
  onCleanup(props.filterPriority.on(() => recompute()));

  function makeSvgEl(w: number, h: number): SVGSVGElement {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("width", String(w));
    s.setAttribute("height", String(h));
    s.style.display = "block";
    s.style.fontFamily = "inherit";
    return s;
  }

  function appendSvgEl(
    svg: SVGSVGElement,
    tag: string,
    attrs: Record<string, string>,
    style?: string,
  ): SVGElement {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (style) el.setAttribute("style", style);
    svg.appendChild(el);
    return el;
  }

  function renderGantt(
    tasks: readonly Task[],
    z: GanttZoom,
  ): { el: HTMLElement; ro: ResizeObserver } {
    const dayW = ganttDayWidth(z);
    const range = buildGanttRange(tasks);
    const timelineW = range.days * dayW + 40;
    const contentH = GANTT_ROW_H * tasks.length;
    const DAY_MS = 24 * 60 * 60 * 1000;
    const BG = "var(--beat-ui-color-background)";
    const BG_EL = "var(--beat-ui-color-background-elevated)";
    const BORDER = "var(--beat-ui-color-border)";

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "display:flex;flex:1;overflow:hidden;height:100%";

    const leftPanel = document.createElement("div");
    leftPanel.style.cssText = [
      `width:${GANTT_LABEL_W}px`,
      "flex-shrink:0",
      "display:flex",
      "flex-direction:column",
      `background:${BG}`,
      `border-right:1px solid ${BORDER}`,
      "z-index:2",
    ].join(";");

    const cornerSpacer = document.createElement("div");
    cornerSpacer.style.cssText = [
      `height:${GANTT_ROW_H}px`,
      "flex-shrink:0",
      `background:${BG_EL}`,
      `border-bottom:1px solid ${BORDER}`,
    ].join(";");
    leftPanel.appendChild(cornerSpacer);

    const leftScroll = document.createElement("div");
    leftScroll.style.cssText = "overflow:hidden;flex:1";
    const leftSvg = makeSvgEl(GANTT_LABEL_W, Math.max(contentH, 1));

    for (const [i, task] of tasks.entries()) {
      const y = GANTT_ROW_H * i;
      const cy = y + GANTT_ROW_H / 2;
      appendSvgEl(leftSvg, "rect", {
        x: "0",
        y: String(y),
        width: String(GANTT_LABEL_W),
        height: String(GANTT_ROW_H),
        fill: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.04)",
      });
      appendSvgEl(leftSvg, "circle", {
        cx: "12",
        cy: String(cy),
        r: "9",
        fill: userAvatarColor(props.users, task.assigneeId),
      });
      appendSvgEl(leftSvg, "text", {
        x: "12",
        y: String(cy + 4),
        "text-anchor": "middle",
        "font-size": "9",
        "font-weight": "700",
        fill: "#fff",
      }).textContent = task.assigneeName?.[0] ?? "?";
      const labelMax = GANTT_LABEL_W - 34;
      const truncated =
        task.title.length * 7 > labelMax
          ? task.title.slice(0, Math.floor(labelMax / 7) - 1) + "…"
          : task.title;
      appendSvgEl(leftSvg, "text", {
        x: "26",
        y: String(cy + 4),
        "font-size": "12",
        "font-weight": "500",
        fill: "var(--beat-ui-color-text)",
      }).textContent = truncated;
      appendSvgEl(leftSvg, "text", {
        x: "26",
        y: String(cy - 8),
        "font-size": "9",
        fill: "var(--beat-ui-color-text-muted)",
        "font-family": "monospace",
      }).textContent = task.displayId;
    }
    leftScroll.appendChild(leftSvg);
    leftPanel.appendChild(leftScroll);

    const scrollbarSpacer = document.createElement("div");
    scrollbarSpacer.style.cssText = "flex-shrink:0;height:0";
    leftPanel.appendChild(scrollbarSpacer);

    wrapper.appendChild(leftPanel);

    const rightPanel = document.createElement("div");
    rightPanel.style.cssText =
      "flex:1;overflow:hidden;display:flex;flex-direction:column;min-width:0";

    const headerDiv = document.createElement("div");
    headerDiv.style.cssText = [
      `height:${GANTT_ROW_H}px`,
      "flex-shrink:0",
      "overflow:hidden",
      `background:${BG_EL}`,
      `border-bottom:1px solid ${BORDER}`,
    ].join(";");
    const headerSvg = makeSvgEl(timelineW, GANTT_ROW_H);

    const todayMs = Date.now();
    const todayX = msToDays(todayMs - range.startMs) * dayW;
    if (todayX > 0 && todayX < timelineW) {
      appendSvgEl(headerSvg, "line", {
        x1: String(todayX),
        y1: "0",
        x2: String(todayX),
        y2: String(GANTT_ROW_H),
        stroke: "#f87171",
        "stroke-width": "1.5",
        "stroke-dasharray": "4 3",
      });
      appendSvgEl(headerSvg, "text", {
        x: String(todayX + 4),
        y: "12",
        "font-size": "10",
        "font-weight": "700",
        fill: "#f87171",
      }).textContent = "Today";
    }
    for (const { label, x } of dateLabels(range, z, dayW)) {
      appendSvgEl(headerSvg, "text", {
        x: String(x),
        y: String(GANTT_ROW_H - 8),
        "font-size": "11",
        fill: "var(--beat-ui-color-text-muted)",
      }).textContent = label;
      appendSvgEl(headerSvg, "line", {
        x1: String(x),
        y1: String(GANTT_ROW_H - 4),
        x2: String(x),
        y2: String(GANTT_ROW_H),
        stroke: BORDER,
        "stroke-width": "1",
      });
    }
    headerDiv.appendChild(headerSvg);
    rightPanel.appendChild(headerDiv);

    const contentScroll = document.createElement("div");
    contentScroll.style.cssText = "overflow:auto;flex:1";
    contentScrollEl = contentScroll;

    const contentSvg = makeSvgEl(timelineW, Math.max(contentH, 1));

    for (let i = 0; i < tasks.length; i++) {
      appendSvgEl(contentSvg, "rect", {
        x: "0",
        y: String(GANTT_ROW_H * i),
        width: String(timelineW),
        height: String(GANTT_ROW_H),
        fill: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.04)",
      });
    }

    if (todayX > 0 && todayX < timelineW) {
      appendSvgEl(contentSvg, "line", {
        x1: String(todayX),
        y1: "0",
        x2: String(todayX),
        y2: String(contentH),
        stroke: "#f87171",
        "stroke-width": "1.5",
        "stroke-dasharray": "4 3",
      });
    }

    for (let d = 0; d < range.days; d++) {
      const ms = range.startMs + d * DAY_MS;
      const date = new Date(ms);
      const isGrid =
        (z === "month" && date.getDate() === 1) ||
        (z === "week" && date.getDay() === 1) ||
        z === "day";
      if (isGrid) {
        appendSvgEl(contentSvg, "line", {
          x1: String(d * dayW),
          y1: "0",
          x2: String(d * dayW),
          y2: String(contentH),
          stroke: BORDER,
          "stroke-width": "0.5",
        });
      }
    }

    for (const [i, task] of tasks.entries()) {
      const cy = GANTT_ROW_H * i + GANTT_ROW_H / 2;
      if (!task.startDate || !task.endDate) continue;
      const barStartDays = msToDays(dateToMs(task.startDate) - range.startMs);
      const barEndDays = msToDays(dateToMs(task.endDate) - range.startMs);
      const barDuration = Math.max(barEndDays - barStartDays, 1);
      const barX = barStartDays * dayW;
      const barW = barDuration * dayW;
      const barH = GANTT_ROW_H * 0.5;
      const barY = cy - barH / 2;
      const barColor = TYPE_COLOR[task.type];

      const barRect = appendSvgEl(
        contentSvg,
        "rect",
        {
          x: String(barX),
          y: String(barY),
          width: String(barW),
          height: String(barH),
          rx: "4",
          fill: barColor + "cc",
          stroke: barColor,
          "stroke-width": "1",
        },
        "cursor:pointer",
      ) as SVGRectElement;
      barRect.addEventListener("click", () => props.onOpenTask(task));

      if (barW > 28) {
        appendSvgEl(contentSvg, "text", {
          x: String(barX + barW / 2),
          y: String(cy + 4),
          "text-anchor": "middle",
          "font-size": "10",
          "font-weight": "700",
          fill: "#fff",
        }).textContent = `${task.storyPoints}SP`;
      }
      appendSvgEl(contentSvg, "circle", {
        cx: String(barX + barW + 6),
        cy: String(cy),
        r: "4",
        fill: PRIORITY_COLOR[task.priority],
      });
    }

    contentScroll.appendChild(contentSvg);
    rightPanel.appendChild(contentScroll);
    wrapper.appendChild(rightPanel);

    contentScroll.addEventListener("scroll", () => {
      leftScroll.scrollTop = contentScroll.scrollTop;
      headerDiv.scrollLeft = contentScroll.scrollLeft;
    });

    const ro = new ResizeObserver(() => {
      const sbH = contentScroll.offsetHeight - contentScroll.clientHeight;
      scrollbarSpacer.style.height = `${sbH}px`;
    });
    ro.observe(contentScroll);

    return { el: wrapper, ro };
  }

  let ganttContainer: HTMLDivElement | null = null;
  let currentGanttEl: HTMLElement | null = null;
  let currentGanttRo: ResizeObserver | null = null;

  function updateGantt(): void {
    if (!ganttContainer) return;
    const prevLeft = contentScrollEl?.scrollLeft ?? 0;
    const prevTop = contentScrollEl?.scrollTop ?? 0;
    if (currentGanttEl) currentGanttEl.remove();
    currentGanttRo?.disconnect();
    const { el, ro } = renderGantt(visibleTasks.get(), zoom.get());
    currentGanttEl = el;
    currentGanttRo = ro;
    ganttContainer.appendChild(el);
    requestAnimationFrame(() => {
      if (contentScrollEl) {
        contentScrollEl.scrollLeft = prevLeft;
        contentScrollEl.scrollTop = prevTop;
      }
    });
  }

  onCleanup(visibleTasks.on(() => updateGantt()));
  onCleanup(zoom.on(() => updateGantt()));
  onCleanup(() => currentGanttRo?.disconnect());

  function zoomBtnStyle(z: GanttZoom): string {
    const active = zoom.get() === z;
    return [
      "padding:0.3rem 0.875rem",
      "font-size:0.8rem",
      "font-weight:600",
      "border:1px solid var(--beat-ui-color-border)",
      "cursor:pointer",
      "transition:background 0.15s,color 0.15s",
      active
        ? "background:var(--beat-ui-color-primary);color:var(--beat-ui-color-primary-text)"
        : "background:var(--beat-ui-color-background-elevated);color:var(--beat-ui-color-text-muted)",
    ].join(";");
  }

  const ZOOMS: readonly { z: GanttZoom; label: string }[] = [
    { z: "month", label: "Monthly" },
    { z: "week", label: "Weekly" },
    { z: "day", label: "Daily" },
  ];

  return (
    <div style="display:flex;flex-direction:column;flex:1;overflow:hidden">
      <div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 1.5rem;flex-shrink:0;border-bottom:1px solid var(--beat-ui-color-border)">
        <div style="display:flex;border-radius:0.5rem;overflow:hidden">
          {ZOOMS.map(({ z, label }) => (
            <button
              style={zoomBtnStyle(z)}
              ref={(el) => {
                onCleanup(
                  zoom.on(() => {
                    (el as HTMLElement).style.cssText = zoomBtnStyle(z);
                  }),
                );
              }}
              onClick={() => zoom.set(z)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style="flex:1;overflow:hidden;padding:0.75rem">
        <div
          style="display:flex;height:100%;overflow:hidden;border-radius:0.5rem;border:1px solid var(--beat-ui-color-border)"
          ref={(el) => {
            ganttContainer = el as HTMLDivElement;
            updateGantt();
          }}
        />
      </div>
    </div>
  );
});

// ── KanbanPage ─────────────────────────────────────────────────────────────────

export interface KanbanPageProps {
  readonly store: KanbanStore;
}

export const KanbanPage = component<KanbanPageProps>((props) => {
  const tasks = props.store.tasks;
  const users = props.store.users;
  const activeTab = pulse<"board" | "gantt">("board");
  const filterAssignee = pulse("");
  const filterPriority = pulse("");
  const editingTask = pulse<Task | null>(null);
  const newTaskColId = pulse<ColumnId | null>(null);

  props.store.loadUsers().catch(() => {});
  props.store.loadTasks().catch(() => {});

  function handleDropTask(taskId: TaskId, colId: ColumnId): void {
    props.store.moveTask(taskId, colId).catch(() => {});
  }

  function handleSaveTask(
    id: TaskId,
    patch: {
      title: string;
      description: string;
      assigneeId: string | null;
      priority: string;
      type: string;
      storyPoints: number;
      columnId: ColumnId;
      startDate: string | null;
      endDate: string | null;
      tags: readonly string[];
    },
  ): void {
    props.store
      .updateTask(id, {
        title: patch.title,
        description: patch.description,
        assigneeId: patch.assigneeId,
        priority: patch.priority,
        type: patch.type,
        storyPoints: patch.storyPoints,
        columnId: patch.columnId,
        startDate: patch.startDate,
        endDate: patch.endDate,
        tags: [...patch.tags],
      })
      .then(() => editingTask.set(null))
      .catch(() => {});
  }

  function handleDeleteTask(id: TaskId): void {
    props.store
      .deleteTask(id)
      .then(() => editingTask.set(null))
      .catch(() => {});
  }

  function handleCreateTask(input: {
    title: string;
    description: string;
    assigneeId: string | null;
    priority: string;
    type: string;
    storyPoints: number;
    columnId: ColumnId;
    startDate: string | null;
    endDate: string | null;
    tags: readonly string[];
  }): void {
    props.store
      .createTask({
        title: input.title,
        description: input.description,
        assigneeId: input.assigneeId as Parameters<
          typeof props.store.createTask
        >[0]["assigneeId"],
        priority: input.priority as Parameters<
          typeof props.store.createTask
        >[0]["priority"],
        type: input.type as Parameters<
          typeof props.store.createTask
        >[0]["type"],
        storyPoints: input.storyPoints,
        columnId: input.columnId,
        startDate: input.startDate,
        endDate: input.endDate,
        tags: [...input.tags],
      })
      .then(() => newTaskColId.set(null))
      .catch(() => {});
  }

  const totalPoints = pulse(0);
  const donePoints = pulse(0);
  function recomputeStats(): void {
    const all = tasks.get();
    totalPoints.set(all.reduce((s, t) => s + t.storyPoints, 0));
    donePoints.set(
      all
        .filter((t) => t.columnId === "done")
        .reduce((s, t) => s + t.storyPoints, 0),
    );
  }
  recomputeStats();
  onCleanup(tasks.on(() => recomputeStats()));

  const progressPct = pulse("0");
  onCleanup(
    tasks.on(() => {
      const total = totalPoints.get();
      progressPct.set(
        total === 0
          ? "0"
          : String(Math.round((donePoints.get() / total) * 100)),
      );
    }),
  );

  return (
    <div style={pageStyle}>
      {/* ── Loading overlay ── */}
      <Show when={props.store.loading} mapValue={(v) => v === true}>
        {() => (
          <div style="position:absolute;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.35)">
            <Loading label="Loading…" />
          </div>
        )}
      </Show>

      {/* ── Error banner ── */}
      <Show when={props.store.error} mapValue={(v) => v !== null}>
        {(msg) => (
          <div style="padding:0.5rem 1.5rem;background:#7f1d1d;color:#fca5a5;font-size:0.8125rem;flex-shrink:0">
            {msg as string}
          </div>
        )}
      </Show>

      {/* ── Page header ── */}
      <div style={headerStyle}>
        <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
          <div>
            <h1 style="margin:0;font-size:1.25rem;font-weight:700;letter-spacing:-0.02em">
              Project Board
            </h1>
            <div style="font-size:0.75rem;color:var(--beat-ui-color-text-muted);margin-top:0.125rem">
              Sprint 4 — Apr 14 – Apr 30, 2026
            </div>
          </div>

          {/* Progress bar */}
          <div style="display:flex;align-items:center;gap:0.625rem">
            <div style="width:8rem;height:0.5rem;border-radius:999px;background:var(--beat-ui-color-background-subtle);border:1px solid var(--beat-ui-color-border);overflow:hidden">
              <div
                style="height:100%;border-radius:999px;background:var(--beat-ui-color-primary);transition:width 0.4s ease"
                ref={(el) => {
                  onCleanup(
                    progressPct.on(({ currentValue }) => {
                      (el as HTMLElement).style.width = currentValue + "%";
                    }),
                  );
                  (el as HTMLElement).style.width = progressPct.get() + "%";
                }}
              />
            </div>
            <span style="font-size:0.75rem;color:var(--beat-ui-color-text-muted)">
              {progressPct}% done ({donePoints} / {totalPoints} SP)
            </span>
          </div>
        </div>

        {/* Filters + add */}
        <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:nowrap">
          <div style="width:11rem;flex-shrink:0">
            <Dropdown
              value={filterAssignee}
              options={[
                { label: "All assignees", value: "" },
                ...users.get().map((u) => ({ label: u.name, value: u.id })),
              ]}
            />
          </div>

          <div style="width:10rem;flex-shrink:0">
            <Dropdown
              value={filterPriority}
              options={[
                { label: "All priorities", value: "" },
                ...PRIORITY_OPTIONS,
              ]}
            />
          </div>

          <Button
            tone="primary"
            onPress={() => {
              newTaskColId.set("backlog");
            }}
          >
            + New Task
          </Button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={tabBarStyle}>
        <button
          style={tabStyle(activeTab.get() === "board")}
          ref={(el) => {
            onCleanup(
              activeTab.on(({ currentValue }) => {
                (el as HTMLElement).style.cssText = tabStyle(
                  currentValue === "board",
                );
              }),
            );
          }}
          onClick={() => activeTab.set("board")}
        >
          Board
        </button>
        <button
          style={tabStyle(activeTab.get() === "gantt")}
          ref={(el) => {
            onCleanup(
              activeTab.on(({ currentValue }) => {
                (el as HTMLElement).style.cssText = tabStyle(
                  currentValue === "gantt",
                );
              }),
            );
          }}
          onClick={() => activeTab.set("gantt")}
        >
          Gantt Chart
        </button>
      </div>

      {/* ── Tab content ── */}
      <div style="flex:1;overflow:hidden;display:flex;flex-direction:column">
        <Show when={activeTab} mapValue={(v) => v === "board"}>
          {() => (
            <BoardTab
              tasks={tasks}
              users={users.get()}
              filterAssignee={filterAssignee}
              filterPriority={filterPriority}
              onAddTask={(colId) => newTaskColId.set(colId)}
              onOpenTask={(task) => editingTask.set({ ...task })}
              onDropTask={handleDropTask}
            />
          )}
        </Show>
        <Show when={activeTab} mapValue={(v) => v === "gantt"}>
          {() => (
            <GanttTab
              tasks={tasks}
              users={users.get()}
              filterAssignee={filterAssignee}
              filterPriority={filterPriority}
              onOpenTask={(task) => editingTask.set({ ...task })}
            />
          )}
        </Show>
      </div>

      {/* ── Task detail modal ── */}
      <Show when={editingTask} mapValue={(v) => v !== null}>
        {(task) => (
          <TaskDetailModal
            task={task as Task}
            users={users.get()}
            onClose={() => editingTask.set(null)}
            onSave={handleSaveTask}
            onDelete={handleDeleteTask}
          />
        )}
      </Show>

      {/* ── New task modal ── */}
      <Show when={newTaskColId} mapValue={(v) => v !== null}>
        {(colId) => (
          <NewTaskModal
            defaultColumnId={colId as ColumnId}
            users={users.get()}
            onClose={() => newTaskColId.set(null)}
            onCreate={handleCreateTask}
          />
        )}
      </Show>
    </div>
  );
});
