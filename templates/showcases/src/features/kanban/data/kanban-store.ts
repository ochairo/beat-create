import type { Pulse } from "@ochairo/pulse";
import { pulse } from "@ochairo/pulse";
import type { Task, TaskId, ColumnId } from "../domain/types";
import type {
  KanbanApi,
  CreateTaskInput,
  UpdateTaskInput,
} from "./kanban-api";

// ── Store interface ────────────────────────────────────────────────────────────

export interface KanbanStore {
  readonly users: Pulse<readonly import("../domain/types.ts").User[]>;
  readonly tasks: Pulse<readonly Task[]>;
  readonly loading: Pulse<boolean>;
  readonly error: Pulse<string | null>;

  loadUsers(): Promise<void>;
  loadTasks(): Promise<void>;
  createTask(input: CreateTaskInput): Promise<Task>;
  updateTask(id: TaskId, input: UpdateTaskInput): Promise<Task>;
  moveTask(id: TaskId, columnId: ColumnId): Promise<Task>;
  deleteTask(id: TaskId): Promise<void>;
}

// ── Factory ────────────────────────────────────────────────────────────────────

export function createKanbanStore(api: KanbanApi): KanbanStore {
  const users = pulse<readonly import("../domain/types.ts").User[]>([]);
  const tasks = pulse<readonly Task[]>([]);
  const loading = pulse(false);
  const error = pulse<string | null>(null);

  function setError(err: unknown): void {
    error.set(err instanceof Error ? err.message : String(err));
  }

  return {
    users,
    tasks,
    loading,
    error,

    async loadUsers(): Promise<void> {
      try {
        const result = await api.listUsers();
        users.set(result);
      } catch (err) {
        setError(err);
      }
    },

    async loadTasks(): Promise<void> {
      loading.set(true);
      error.set(null);
      try {
        const result = await api.listTasks();
        tasks.set(result);
      } catch (err) {
        setError(err);
      } finally {
        loading.set(false);
      }
    },

    async createTask(input: CreateTaskInput): Promise<Task> {
      const task = await api.createTask(input);
      tasks.set([...tasks.get(), task]);
      return task;
    },

    async updateTask(id: TaskId, input: UpdateTaskInput): Promise<Task> {
      const updated = await api.updateTask(id, input);
      tasks.set(tasks.get().map((t) => (t.id === id ? updated : t)));
      return updated;
    },

    async moveTask(id: TaskId, columnId: ColumnId): Promise<Task> {
      const updated = await api.updateTask(id, { columnId });
      tasks.set(tasks.get().map((t) => (t.id === id ? updated : t)));
      return updated;
    },

    async deleteTask(id: TaskId): Promise<void> {
      await api.deleteTask(id);
      tasks.set(tasks.get().filter((t) => t.id !== id));
    },
  };
}
