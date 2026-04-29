import { Show, component, onCleanup } from "@ochairo/beat";
import { Button, Dropdown, Loading } from "@ochairo/beat-ui";
import { pulse } from "@ochairo/pulse";
import type { ColumnId, Task, TaskId } from "../domain/types";
import type { KanbanStore } from "../data/kanban-store";
import { PRIORITY_OPTIONS } from "./components/kanban-constants";
import { TaskDetailModal } from "./components/task-detail-modal/TaskDetailModal";
import { NewTaskModal } from "./components/new-task-modal/NewTaskModal";
import { BoardTab } from "./components/board-tab/BoardTab";
import { GanttTab } from "./components/gantt-tab/GanttTab";
import css from "./kanban-page.module.css";

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
    <div class={css["page"]}>
      {/* ── Loading overlay ── */}
      <Show when={props.store.loading} mapValue={(v) => v === true}>
        {() => (
          <div class={css["loadingOverlay"]}>
            <Loading label="Loading…" />
          </div>
        )}
      </Show>

      {/* ── Error banner ── */}
      <Show when={props.store.error} mapValue={(v) => v !== null}>
        {(msg) => <div class={css["errorBanner"]}>{msg as string}</div>}
      </Show>

      {/* ── Page header ── */}
      <div class={css["header"]}>
        <div class={css["headerLeft"]}>
          <div>
            <h1 class={css["headerTitle"]}>Project Board</h1>
            <div class={css["headerSubtitle"]}>
              Sprint 4 — Apr 14 – Apr 30, 2026
            </div>
          </div>

          {/* Progress bar */}
          <div class={css["progressRow"]}>
            <div class={css["progressTrack"]}>
              <div
                class={css["progressFill"]}
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
            <span class={css["progressLabel"]}>
              {progressPct}% done ({donePoints} / {totalPoints} SP)
            </span>
          </div>
        </div>

        {/* Filters + add */}
        <div class={css["filters"]}>
          <div class={css["filterAssignee"]}>
            <Dropdown
              value={filterAssignee}
              options={[
                { label: "All assignees", value: "" },
                ...users.get().map((u) => ({ label: u.name, value: u.id })),
              ]}
            />
          </div>

          <div class={css["filterPriority"]}>
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
      <div class={css["tabBar"]}>
        <button
          class={activeTab.get() === "board" ? css["tabActive"] : css["tab"]}
          ref={(el) => {
            onCleanup(
              activeTab.on(({ currentValue }) => {
                (el as HTMLElement).className =
                  currentValue === "board"
                    ? (css["tabActive"] ?? "")
                    : (css["tab"] ?? "");
              }),
            );
          }}
          onClick={() => activeTab.set("board")}
        >
          Board
        </button>
        <button
          class={activeTab.get() === "gantt" ? css["tabActive"] : css["tab"]}
          ref={(el) => {
            onCleanup(
              activeTab.on(({ currentValue }) => {
                (el as HTMLElement).className =
                  currentValue === "gantt"
                    ? (css["tabActive"] ?? "")
                    : (css["tab"] ?? "");
              }),
            );
          }}
          onClick={() => activeTab.set("gantt")}
        >
          Gantt Chart
        </button>
      </div>

      {/* ── Tab content ── */}
      <div class={css["tabContent"]}>
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
