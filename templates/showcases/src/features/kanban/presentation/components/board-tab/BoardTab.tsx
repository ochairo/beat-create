import { For, component, onCleanup } from "@ochairo/beat";
import { CardWrapper } from "@ochairo/beat-ui";
import { pulse, type Pulse } from "@ochairo/pulse";
import type { ColumnId, Task, TaskId, User } from "../../../domain/types";
import {
  COLUMN_COLOR,
  COLUMNS,
  PRIORITY_COLOR,
  TYPE_COLOR,
  userAvatarColor,
} from "../kanban-constants";
import css from "./board-tab.module.css";

// ── Props ──────────────────────────────────────────────────────────────────────

export interface BoardTabProps {
  readonly tasks: Pulse<readonly Task[]>;
  readonly users: readonly User[];
  readonly filterAssignee: Pulse<string>;
  readonly filterPriority: Pulse<string>;
  readonly onAddTask: (colId: ColumnId) => void;
  readonly onOpenTask: (task: Task) => void;
  readonly onDropTask: (taskId: TaskId, colId: ColumnId) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export const BoardTab = component<BoardTabProps>((props) => {
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
    <div class={css["boardWrap"]}>
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
            class={css["column"]}
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
            <div
              class={css["columnHeader"]}
              style={`border-top:3px solid ${COLUMN_COLOR[col.id]}`}
            >
              <div class={css["columnHeaderLeft"]}>
                <span class={css["columnLabel"]}>{col.label}</span>
                <span
                  class={css["columnCount"]}
                  style={`background:${COLUMN_COLOR[col.id]}22;color:${COLUMN_COLOR[col.id]}`}
                >
                  {colCount}
                </span>
              </div>
              <button
                class={css["columnAddBtn"]}
                title="Add task"
                onClick={() => props.onAddTask(col.id)}
              >
                +
              </button>
            </div>

            {/* Cards */}
            <div
              __beatStyleBindings={{ background: isOver }}
              class={css["columnDropTarget"]}
            >
              <For each={colTasks} key={(t) => t.id}>
                {(taskPulse) => {
                  const isDragging = pulse(false);

                  return (
                    <CardWrapper
                      as="div"
                      class={css["card"] ?? ""}
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
                      <div class={css["cardTypeRow"]}>
                        <span
                          class={css["cardTypeBadge"]}
                          style={`background:${TYPE_COLOR[taskPulse.get().type]}22;color:${TYPE_COLOR[taskPulse.get().type]}`}
                        >
                          {taskPulse.get().type}
                        </span>
                        <span
                          class={css["cardPriorityDot"]}
                          style={`background:${PRIORITY_COLOR[taskPulse.get().priority]}`}
                          title={taskPulse.get().priority}
                        />
                      </div>

                      {/* Title */}
                      <div class={css["cardTitle"]}>
                        {taskPulse.get().title}
                      </div>

                      {/* Tags */}
                      <div class={css["cardTags"]}>
                        {taskPulse.get().tags.map((tag) => (
                          <span class={css["cardTag"]}>{tag}</span>
                        ))}
                      </div>

                      {/* Footer: assignee + points */}
                      <div class={css["cardFooter"]}>
                        <div class={css["cardAssignee"]}>
                          <span
                            class={css["cardAvatar"]}
                            style={`background:${userAvatarColor(props.users, taskPulse.get().assigneeId)}`}
                          >
                            {taskPulse.get().assigneeName?.[0] ?? "?"}
                          </span>
                          <span class={css["cardAssigneeName"]}>
                            {taskPulse.get().assigneeName ?? "Unassigned"}
                          </span>
                        </div>
                        <span class={css["cardPoints"]} title="Story points">
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
