import { component } from "@ochairo/beat";
import {
  Badge,
  Button,
  Dialog,
  Dropdown,
  Input,
  TextArea,
  TextInput,
} from "@ochairo/beat-ui";
import { pulse } from "@ochairo/pulse";
import type {
  ColumnId,
  Priority,
  Task,
  TaskId,
  TaskType,
  User,
} from "../../../domain/types";
import {
  COLUMN_OPTIONS,
  PRIORITY_OPTIONS,
  TYPE_COLOR,
  TYPE_OPTIONS,
} from "../kanban-constants";
import css from "./task-detail-modal.module.css";

// ── Props ──────────────────────────────────────────────────────────────────────

export interface TaskDetailModalProps {
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

// ── Component ──────────────────────────────────────────────────────────────────

export const TaskDetailModal = component<TaskDetailModalProps>((props) => {
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
        <div class={css["dialogTitleRow"]}>
          <Badge color={TYPE_COLOR[props.task.type as TaskType]}>
            {props.task.type.toUpperCase()}
          </Badge>
          <span class={css["dialogTitleId"]}>{props.task.displayId}</span>
        </div>
      }
      footer={
        <div class={css["dialogFooter"]}>
          <Button
            tone="danger"
            appearance="ghost"
            onPress={() => props.onDelete(props.task.id)}
          >
            Delete task
          </Button>
          <div class={css["dialogFooterActions"]}>
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
      <div class={css["formColumn"]}>
        <div class={css["formRow"]}>
          <label class={css["formLabel"]}>Title</label>
          <TextInput value={titlePulse} />
        </div>

        <div class={css["formRow"]}>
          <label class={css["formLabel"]}>Description</label>
          <TextArea value={descPulse} rows={3} />
        </div>

        <div class={css["formGrid"]}>
          <div class={css["formRow"]}>
            <label class={css["formLabel"]}>Assignee</label>
            <Dropdown value={assigneeIdPulse} options={assigneeOptions} />
          </div>

          <div class={css["formRow"]}>
            <label class={css["formLabel"]}>Priority</label>
            <Dropdown value={priorityPulse} options={PRIORITY_OPTIONS} />
          </div>

          <div class={css["formRow"]}>
            <label class={css["formLabel"]}>Type</label>
            <Dropdown value={typePulse} options={TYPE_OPTIONS} />
          </div>

          <div class={css["formRow"]}>
            <label class={css["formLabel"]}>Story Points</label>
            <Input type="number" value={spPulse} />
          </div>

          <div class={css["formRow"]}>
            <label class={css["formLabel"]}>Start Date</label>
            <input
              type="date"
              class={css["formDateInput"]}
              value={startDatePulse.get()}
              onInput={(e: Event) => {
                startDatePulse.set((e.currentTarget as HTMLInputElement).value);
              }}
            />
          </div>

          <div class={css["formRow"]}>
            <label class={css["formLabel"]}>End Date</label>
            <input
              type="date"
              class={css["formDateInput"]}
              value={endDatePulse.get()}
              onInput={(e: Event) => {
                endDatePulse.set((e.currentTarget as HTMLInputElement).value);
              }}
            />
          </div>
        </div>

        <div class={css["formRow"]}>
          <label class={css["formLabel"]}>Column</label>
          <Dropdown value={columnIdPulse} options={COLUMN_OPTIONS} />
        </div>

        <div class={css["formRow"]}>
          <label class={css["formLabel"]}>Tags (comma separated)</label>
          <TextInput value={tagsPulse} placeholder="frontend, backend…" />
        </div>
      </div>
    </Dialog>
  );
});
