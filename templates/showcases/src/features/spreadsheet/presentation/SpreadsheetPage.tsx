import { component } from "@ochairo/beat";
import {
  Button,
  ExcelTable,
  type ExcelTableColumn,
  type ExcelTableGrid,
} from "@ochairo/beat-ui";
import { pulse } from "@ochairo/pulse";

// ── Static options ─────────────────────────────────────────────────────────────

const ASSIGNEE_OPTIONS = ["Alice", "Bob", "Carol", "Dave", "Sam"] as const;
const STATUS_OPTIONS = ["Backlog", "In Progress", "Review", "Done"] as const;
const PRIORITY_OPTIONS = ["low", "medium", "high", "critical"] as const;

// ── Column definitions ─────────────────────────────────────────────────────────

const INITIAL_COLUMNS: readonly ExcelTableColumn[] = [
  { key: "task", header: "Task", width: "16rem", sortable: true },
  {
    key: "assignee",
    header: "Assignee",
    width: "10rem",
    sortable: true,
    cellType: "select",
    cellOptions: [...ASSIGNEE_OPTIONS],
  },
  {
    key: "status",
    header: "Status",
    width: "10rem",
    sortable: true,
    cellType: "select",
    cellOptions: [...STATUS_OPTIONS],
  },
  {
    key: "priority",
    header: "Priority",
    width: "9rem",
    sortable: true,
    cellType: "radio",
    cellOptions: [...PRIORITY_OPTIONS],
  },
  {
    key: "points",
    header: "SP",
    width: "5rem",
    align: "right",
    sortable: true,
    cellType: "number",
  },
  {
    key: "urgent",
    header: "Urgent",
    width: "6rem",
    align: "center",
    cellType: "checkbox",
  },
  { key: "start", header: "Start Date", width: "10rem", cellType: "date" },
  { key: "end", header: "End Date", width: "10rem", cellType: "date" },
  { key: "due_time", header: "Due Time", width: "8rem", cellType: "time" },
  { key: "notes", header: "Notes", width: "18rem", cellType: "textarea" },
  {
    key: "reference",
    header: "Reference URL",
    width: "18rem",
    cellType: "link",
  },
];

// ── Initial data ───────────────────────────────────────────────────────────────

const INITIAL_GRID: ExcelTableGrid = [
  [
    { value: "Notification service" },
    { value: "Alice" },
    { value: "In Progress" },
    { value: "high" },
    { value: 5 },
    { value: "true" },
    { value: "2026-04-20" },
    { value: "2026-05-02" },
    { value: "09:00" },
    { value: "Push + email channels.\nNeeds load testing." },
    { value: "[Issue #42](https://github.com/org/repo/issues/42)" },
  ],
  [
    { value: "Mobile responsive layout" },
    { value: "Dave" },
    { value: "Review" },
    { value: "medium" },
    { value: 5 },
    { value: "false" },
    { value: "2026-04-22" },
    { value: "2026-05-05" },
    { value: "17:00" },
    { value: "Breakpoints: 320, 768, 1280." },
    { value: "[Figma design](https://figma.com/file/responsive)" },
  ],
  [
    { value: "E2E test suite" },
    { value: "Alice" },
    { value: "Review" },
    { value: "medium" },
    { value: 8 },
    { value: "false" },
    { value: "2026-04-24" },
    { value: "2026-05-08" },
    { value: "14:00" },
    { value: "Playwright + CI integration." },
    { value: "[Playwright docs](https://playwright.dev)" },
  ],
  [
    { value: "Accessibility audit" },
    { value: "Carol" },
    { value: "Review" },
    { value: "medium" },
    { value: 5 },
    { value: "false" },
    { value: "2026-04-25" },
    { value: "2026-05-08" },
    { value: "10:00" },
    { value: "WCAG 2.1 AA compliance." },
    { value: "[WCAG 2.1](https://www.w3.org/TR/WCAG21/)" },
  ],
  [
    { value: "Search & filtering epic" },
    { value: "Alice" },
    { value: "In Progress" },
    { value: "critical" },
    { value: 21 },
    { value: "true" },
    { value: "2026-04-27" },
    { value: "2026-05-18" },
    { value: "09:30" },
    { value: "Elasticsearch backend.\nFaceted filters required." },
    { value: "[Elastic docs](https://elastic.co/docs)" },
  ],
  [
    { value: "Dark / light theme toggle" },
    { value: "Dave" },
    { value: "Done" },
    { value: "low" },
    { value: 3 },
    { value: "false" },
    { value: "2026-04-07" },
    { value: "2026-04-11" },
    { value: "16:00" },
    { value: "CSS vars + prefers-color-scheme." },
    {
      value:
        "[MDN prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/prefers-color-scheme)",
    },
  ],
  [
    { value: "CSV export" },
    { value: "Sam" },
    { value: "In Progress" },
    { value: "medium" },
    { value: 5 },
    { value: "false" },
    { value: "2026-04-28" },
    { value: "2026-05-05" },
    { value: "11:00" },
    { value: "Support UTF-8 BOM for Excel." },
    { value: "[Issue #88](https://github.com/org/repo/issues/88)" },
  ],
  [
    { value: "Fix memory leak in WebSocket" },
    { value: "Carol" },
    { value: "Backlog" },
    { value: "critical" },
    { value: 3 },
    { value: "true" },
    { value: "2026-04-27" },
    { value: "2026-04-28" },
    { value: "08:00" },
    { value: "Reproduce with ws v8 + Node 22." },
    { value: "[Issue #99](https://github.com/org/repo/issues/99)" },
  ],
  [
    { value: "Database query optimisation" },
    { value: "Sam" },
    { value: "Backlog" },
    { value: "high" },
    { value: 8 },
    { value: "false" },
    { value: "2026-04-28" },
    { value: "2026-05-06" },
    { value: "15:00" },
    { value: "Add missing indexes.\nAnalyse slow query log." },
    { value: "[Issue #104](https://github.com/org/repo/issues/104)" },
  ],
  [
    { value: "User role management" },
    { value: "Bob" },
    { value: "In Progress" },
    { value: "high" },
    { value: 13 },
    { value: "false" },
    { value: "2026-04-29" },
    { value: "2026-05-09" },
    { value: "13:00" },
    { value: "RBAC with permission matrix." },
    { value: "[Issue #111](https://github.com/org/repo/issues/111)" },
  ],
];

// ── Component ──────────────────────────────────────────────────────────────────

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

export const SpreadsheetPage = component(() => {
  const grid = pulse<ExcelTableGrid>(INITIAL_GRID);
  const columns = pulse<readonly ExcelTableColumn[]>(INITIAL_COLUMNS);

  function addRow(): void {
    const empty = columns.get().map(() => ({ value: "" }));
    grid.set([...grid.get(), empty]);
  }

  function addColumn(): void {
    const idx = columns.get().length + 1;
    columns.set([
      ...columns.get(),
      { key: `col${idx}`, header: `Column ${idx}`, width: "10rem" },
    ]);
    grid.set(grid.get().map((row) => [...row, { value: "" }]));
  }

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style="margin:0;font-size:1.25rem;font-weight:700;letter-spacing:-0.02em">
            Spreadsheet
          </h1>
          <div style="font-size:0.75rem;color:var(--beat-ui-color-text-muted);margin-top:0.125rem">
            Click a cell to select · Double-click or type to edit · Space
            toggles checkboxes · Tab / Enter to navigate · Ctrl+C / Ctrl+V to
            copy/paste
          </div>
        </div>
        <div style="display:flex;gap:0.5rem">
          <Button appearance="ghost" onPress={addRow}>
            + Row
          </Button>
          <Button appearance="ghost" onPress={addColumn}>
            + Column
          </Button>
        </div>
      </div>

      {/* Table */}
      <div style="flex:1;overflow:auto;padding:1rem 1.5rem">
        <ExcelTable
          value={grid}
          columns={columns.get()}
          showRowHeaders={true}
          onColumnsChange={(cols) => columns.set(cols)}
          onChange={(next) => grid.set(next)}
        />
      </div>
    </div>
  );
});
