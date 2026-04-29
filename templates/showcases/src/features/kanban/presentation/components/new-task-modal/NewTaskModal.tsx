import { component } from "@ochairo/beat";
import {
  Button,
  Dialog,
  Dropdown,
  Input,
  TextArea,
  TextInput,
} from "@ochairo/beat-ui";
import { pulse } from "@ochairo/pulse";
import type { ColumnId, Priority, TaskType, User } from "../../../domain/types";
import {
  COLUMN_OPTIONS,
  PRIORITY_OPTIONS,
  TYPE_OPTIONS,
} from "../kanban-constants";
import css from "./new-task-modal.module.css";

// ── Props ──────────────────────────────────────────────────────────────────────

export interface NewTaskModalProps {
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

// ── Component ──────────────────────────────────────────────────────────────────

export const NewTaskModal = component<NewTaskModalProps>((props) => {
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
      <div class={css["formColumn"]}>
        <div class={css["formRow"]}>
          <label class={css["formLabel"]}>Title *</label>
          <TextInput value={titlePulse} placeholder="Task title…" />
        </div>

        <div class={css["formRow"]}>
          <label class={css["formLabel"]}>Description</label>
          <TextArea
            value={descPulse}
            placeholder="Optional description…"
            rows={3}
          />
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
