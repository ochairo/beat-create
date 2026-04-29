import { component, onCleanup } from "@ochairo/beat";
import { pulse, type Pulse } from "@ochairo/pulse";
import type { Task, User } from "../../../domain/types";
import {
  PRIORITY_COLOR,
  TYPE_COLOR,
  dateToMs,
  msToDays,
  userAvatarColor,
} from "../kanban-constants";
import css from "./gantt-tab.module.css";

// ── Gantt types ────────────────────────────────────────────────────────────────

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

// ── Props ──────────────────────────────────────────────────────────────────────

export interface GanttTabProps {
  readonly tasks: Pulse<readonly Task[]>;
  readonly users: readonly User[];
  readonly filterAssignee: Pulse<string>;
  readonly filterPriority: Pulse<string>;
  readonly onOpenTask: (task: Task) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export const GanttTab = component<GanttTabProps>((props) => {
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
    s.style.minWidth = `${w}px`;
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
    contentScroll.className = css["ganttScroll"] ?? "gantt-scroll";
    contentScroll.style.cssText =
      "flex:1;overflow-x:scroll;overflow-y:auto;scrollbar-width:thin";
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

  const ZOOMS: readonly { z: GanttZoom; label: string }[] = [
    { z: "month", label: "Monthly" },
    { z: "week", label: "Weekly" },
    { z: "day", label: "Daily" },
  ];

  return (
    <div class={css["ganttRoot"]}>
      <div class={css["ganttToolbar"]}>
        <div class={css["ganttZoomGroup"]}>
          {ZOOMS.map(({ z, label }) => (
            <button
              class={
                zoom.get() === z
                  ? css["ganttZoomBtnActive"]
                  : css["ganttZoomBtn"]
              }
              ref={(el) => {
                onCleanup(
                  zoom.on(({ currentValue }) => {
                    (el as HTMLElement).className =
                      currentValue === z
                        ? (css["ganttZoomBtnActive"] ?? "")
                        : (css["ganttZoomBtn"] ?? "");
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

      <div class={css["ganttBody"]}>
        <div
          class={css["ganttContainer"]}
          ref={(el) => {
            ganttContainer = el as HTMLDivElement;
            updateGantt();
          }}
        />
      </div>
    </div>
  );
});
