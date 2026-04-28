import type { Task, TaskId, User } from "../domain/types.ts";

// ── Input types ────────────────────────────────────────────────────────────────

export interface CreateTaskInput {
  readonly title: string;
  readonly description: string;
  readonly assigneeId: string | null;
  readonly priority: string;
  readonly type: string;
  readonly storyPoints: number;
  readonly columnId: string;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly tags: readonly string[];
}

export interface UpdateTaskInput {
  readonly title?: string;
  readonly description?: string;
  readonly assigneeId?: string | null;
  readonly priority?: string;
  readonly type?: string;
  readonly storyPoints?: number;
  readonly columnId?: string;
  readonly startDate?: string | null;
  readonly endDate?: string | null;
  readonly tags?: readonly string[];
}

// ── Port ──────────────────────────────────────────────────────────────────────

export interface KanbanApi {
  listUsers(): Promise<readonly User[]>;
  listTasks(): Promise<readonly Task[]>;
  getTask(id: TaskId): Promise<Task>;
  createTask(input: CreateTaskInput): Promise<Task>;
  updateTask(id: TaskId, input: UpdateTaskInput): Promise<Task>;
  deleteTask(id: TaskId): Promise<void>;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_USERS: readonly User[] = [
  {
    id: "u1",
    name: "Alice Chen",
    email: "alice@example.com",
    avatarColor: "#6366f1",
    role: "admin",
  },
  {
    id: "u2",
    name: "Bob Kim",
    email: "bob@example.com",
    avatarColor: "#f59e0b",
    role: "member",
  },
  {
    id: "u3",
    name: "Carol Day",
    email: "carol@example.com",
    avatarColor: "#10b981",
    role: "member",
  },
  {
    id: "u4",
    name: "Dave Park",
    email: "dave@example.com",
    avatarColor: "#f43f5e",
    role: "viewer",
  },
];

let taskIdCounter = 12;

function nextDisplayId(): string {
  taskIdCounter += 1;
  return `PROJ-${taskIdCounter}`;
}

const INITIAL_TASKS: Task[] = [
  {
    id: "t1",
    displayId: "PROJ-1",
    projectId: "proj-1",
    sprintId: "sprint-4",
    assigneeId: "u1",
    assigneeName: "Alice Chen",
    title: "Set up CI pipeline",
    description: "Configure GitHub Actions for automated builds and tests.",
    priority: "high",
    type: "chore",
    storyPoints: 5,
    columnId: "done",
    startDate: "2026-04-01",
    endDate: "2026-04-04",
    tags: ["devops", "ci"],
  },
  {
    id: "t2",
    displayId: "PROJ-2",
    projectId: "proj-1",
    sprintId: "sprint-4",
    assigneeId: "u2",
    assigneeName: "Bob Kim",
    title: "Auth service — JWT refresh tokens",
    description: "Implement refresh token rotation with sliding expiry.",
    priority: "critical",
    type: "feature",
    storyPoints: 8,
    columnId: "done",
    startDate: "2026-04-03",
    endDate: "2026-04-09",
    tags: ["auth", "backend"],
  },
  {
    id: "t3",
    displayId: "PROJ-3",
    projectId: "proj-1",
    sprintId: "sprint-4",
    assigneeId: "u3",
    assigneeName: "Carol Day",
    title: "Design system tokens",
    description: "Define color, spacing, and typography tokens for the UI.",
    priority: "medium",
    type: "chore",
    storyPoints: 3,
    columnId: "review",
    startDate: "2026-04-07",
    endDate: "2026-04-10",
    tags: ["design", "frontend"],
  },
  {
    id: "t4",
    displayId: "PROJ-4",
    projectId: "proj-1",
    sprintId: "sprint-4",
    assigneeId: "u1",
    assigneeName: "Alice Chen",
    title: "WebSocket price feed integration",
    description: "Connect to live market data via WebSocket and update store.",
    priority: "high",
    type: "feature",
    storyPoints: 13,
    columnId: "in-progress",
    startDate: "2026-04-14",
    endDate: "2026-04-22",
    tags: ["websocket", "market-data"],
  },
  {
    id: "t5",
    displayId: "PROJ-5",
    projectId: "proj-1",
    sprintId: "sprint-4",
    assigneeId: "u4",
    assigneeName: "Dave Park",
    title: "Fix sparkline rendering on Safari",
    description: "SVG path rendering differs on Safari 17. Needs polyfill.",
    priority: "high",
    type: "bug",
    storyPoints: 3,
    columnId: "in-progress",
    startDate: "2026-04-15",
    endDate: "2026-04-17",
    tags: ["bug", "safari", "frontend"],
  },
  {
    id: "t6",
    displayId: "PROJ-6",
    projectId: "proj-1",
    sprintId: "sprint-4",
    assigneeId: "u2",
    assigneeName: "Bob Kim",
    title: "Kanban drag-and-drop",
    description: "Implement native HTML5 drag-and-drop for task columns.",
    priority: "medium",
    type: "feature",
    storyPoints: 8,
    columnId: "in-progress",
    startDate: "2026-04-16",
    endDate: "2026-04-23",
    tags: ["kanban", "dnd", "frontend"],
  },
  {
    id: "t7",
    displayId: "PROJ-7",
    projectId: "proj-1",
    sprintId: "sprint-4",
    assigneeId: "u3",
    assigneeName: "Carol Day",
    title: "Spreadsheet cell validation",
    description: "Add type-aware validation rules to ExcelTable cells.",
    priority: "medium",
    type: "feature",
    storyPoints: 5,
    columnId: "todo",
    startDate: "2026-04-21",
    endDate: "2026-04-25",
    tags: ["spreadsheet", "validation"],
  },
  {
    id: "t8",
    displayId: "PROJ-8",
    projectId: "proj-1",
    sprintId: "sprint-4",
    assigneeId: "u1",
    assigneeName: "Alice Chen",
    title: "Price chart crosshair tooltip",
    description: "Show price + date on hover over the SVG chart.",
    priority: "low",
    type: "feature",
    storyPoints: 5,
    columnId: "todo",
    startDate: "2026-04-22",
    endDate: "2026-04-26",
    tags: ["chart", "ux"],
  },
  {
    id: "t9",
    displayId: "PROJ-9",
    projectId: "proj-1",
    sprintId: "sprint-4",
    assigneeId: "u4",
    assigneeName: "Dave Park",
    title: "Accessibility audit",
    description: "WCAG 2.1 AA review for all interactive components.",
    priority: "medium",
    type: "chore",
    storyPoints: 5,
    columnId: "todo",
    startDate: "2026-04-24",
    endDate: "2026-04-29",
    tags: ["a11y"],
  },
  {
    id: "t10",
    displayId: "PROJ-10",
    projectId: "proj-1",
    sprintId: "sprint-4",
    assigneeId: "u2",
    assigneeName: "Bob Kim",
    title: "Performance profiling — initial load",
    description: "Identify and resolve bundle size issues above 100 kB.",
    priority: "high",
    type: "chore",
    storyPoints: 8,
    columnId: "backlog",
    startDate: "2026-04-28",
    endDate: "2026-05-02",
    tags: ["performance"],
  },
  {
    id: "t11",
    displayId: "PROJ-11",
    projectId: "proj-1",
    sprintId: null,
    assigneeId: "u3",
    assigneeName: "Carol Day",
    title: "Dark mode for ExcelTable",
    description: "ExcelTable header and cell backgrounds need dark mode vars.",
    priority: "low",
    type: "bug",
    storyPoints: 2,
    columnId: "backlog",
    startDate: "2026-04-29",
    endDate: "2026-05-05",
    tags: ["dark-mode", "spreadsheet"],
  },
  {
    id: "t12",
    displayId: "PROJ-12",
    projectId: "proj-1",
    sprintId: null,
    assigneeId: null,
    assigneeName: null,
    title: "Portfolio P&L calculation",
    description:
      "Implement realized and unrealized P&L per asset in the store.",
    priority: "medium",
    type: "epic",
    storyPoints: 21,
    columnId: "backlog",
    startDate: null,
    endDate: null,
    tags: ["portfolio", "finance"],
  },
];

// ── Fake adapter ──────────────────────────────────────────────────────────────

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function createFakeKanbanApi(): KanbanApi {
  const tasks: Task[] = INITIAL_TASKS.map((t) => ({ ...t }));

  return {
    listUsers(): Promise<readonly User[]> {
      return delay([...MOCK_USERS]);
    },

    listTasks(): Promise<readonly Task[]> {
      return delay([...tasks]);
    },

    getTask(id: TaskId): Promise<Task> {
      const task = tasks.find((t) => t.id === id);
      if (task === undefined)
        return Promise.reject(new Error(`Task ${id} not found`));
      return delay({ ...task });
    },

    createTask(input: CreateTaskInput): Promise<Task> {
      const user = MOCK_USERS.find((u) => u.id === input.assigneeId) ?? null;
      const task: Task = {
        id: `t${Date.now()}`,
        displayId: nextDisplayId(),
        projectId: "proj-1",
        sprintId: "sprint-4",
        assigneeId: input.assigneeId,
        assigneeName: user?.name ?? null,
        title: input.title,
        description: input.description,
        priority: input.priority as Task["priority"],
        type: input.type as Task["type"],
        storyPoints: input.storyPoints,
        columnId: input.columnId as Task["columnId"],
        startDate: input.startDate,
        endDate: input.endDate,
        tags: [...input.tags],
      };
      tasks.push(task);
      return delay({ ...task });
    },

    updateTask(id: TaskId, input: UpdateTaskInput): Promise<Task> {
      const idx = tasks.findIndex((t) => t.id === id);
      if (idx === -1) return Promise.reject(new Error(`Task ${id} not found`));
      const current = tasks[idx]!;
      const user =
        input.assigneeId !== undefined
          ? (MOCK_USERS.find((u) => u.id === input.assigneeId) ?? null)
          : (MOCK_USERS.find((u) => u.id === current.assigneeId) ?? null);
      const updated: Task = {
        ...current,
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.assigneeId !== undefined
          ? { assigneeId: input.assigneeId, assigneeName: user?.name ?? null }
          : {}),
        ...(input.priority !== undefined
          ? { priority: input.priority as Task["priority"] }
          : {}),
        ...(input.type !== undefined
          ? { type: input.type as Task["type"] }
          : {}),
        ...(input.storyPoints !== undefined
          ? { storyPoints: input.storyPoints }
          : {}),
        ...(input.columnId !== undefined
          ? { columnId: input.columnId as Task["columnId"] }
          : {}),
        ...(input.startDate !== undefined
          ? { startDate: input.startDate }
          : {}),
        ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
        ...(input.tags !== undefined ? { tags: [...input.tags] } : {}),
      };
      tasks[idx] = updated;
      return delay({ ...updated });
    },

    deleteTask(id: TaskId): Promise<void> {
      const idx = tasks.findIndex((t) => t.id === id);
      if (idx >= 0) tasks.splice(idx, 1);
      return delay(undefined as unknown as void);
    },
  };
}
