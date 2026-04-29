import { Show, component, onCleanup } from "@ochairo/beat";
import { pulse, type Pulse } from "@ochairo/pulse";
import type { LivePriceTick } from "../../../../../../shared/data/fake-market-client";
import type { SymbolInfo } from "../../../../../../shared/market/market-symbols";
import { fetchPriceHistory } from "../../../../data/fake-history-client";
import type { ChartRange, PriceHistoryPoint } from "../../../../domain/types";
import {
  CHART_H,
  CHART_W,
  INNER_H,
  INNER_W,
  PAD_L,
  PAD_T,
  RANGES,
  buildChart,
  formatPrice,
  formatXLabel,
  formatYLabel,
} from "../chart-utils";
import css from "./price-chart.module.css";

// ── Props ──────────────────────────────────────────────────────────────────────

export interface PriceChartProps {
  readonly info: SymbolInfo;
  readonly liveTick: Pulse<LivePriceTick | null>;
  readonly onStatsUpdate: (stats: {
    priceDisplay: string;
    priceColor: string;
    sessionChange: string;
    changeColor: string;
    changeBadgeBg: string;
    volumeDisplay: string;
    sourceDisplay: string;
  }) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export const PriceChart = component<PriceChartProps>((props) => {
  const activeRange = pulse<ChartRange>("24h");
  const chartLinePath = pulse("");
  const chartAreaPath = pulse("");
  const chartColor = pulse("var(--beat-ui-color-success)");
  const chartYLabels = pulse("");
  const chartXLabels = pulse("");
  const chartHGridLines = pulse("");
  const chartVGridLines = pulse("");
  const chartVolumeBars = pulse("");
  const liveLoaded = pulse(false);

  const gradId = `cg-${props.info.symbol}`;

  let chartValues: readonly number[] = [];
  let chartTimestamps: readonly number[] = [];
  let baseVals: number[] = [];
  let baseTs: number[] = [];
  let baseVols: number[] = [];
  let chartMin = 0;
  let chartMax = 0;
  let currentChartColor = "var(--beat-ui-color-success)";

  let chartSvgEl: SVGSVGElement | null = null;
  let priceBadgeLineEl: Element | null = null;
  let priceBadgeRectEl: Element | null = null;
  let priceBadgeTextEl: Element | null = null;
  let sessionHighLineEl: Element | null = null;
  let sessionHighTextEl: Element | null = null;
  let crosshairVEl: Element | null = null;
  let crosshairHEl: Element | null = null;
  let crosshairDotEl: Element | null = null;
  let crosshairTipRectEl: Element | null = null;
  let crosshairTipPrice: Element | null = null;
  let crosshairTipDate: Element | null = null;

  function updatePriceBadge(): void {
    if (chartValues.length < 2) return;
    const lastVal = chartValues[chartValues.length - 1]!;
    const priceRange = chartMax - chartMin || 1;
    const y = PAD_T + (1 - (lastVal - chartMin) / priceRange) * INNER_H;
    const label = formatYLabel(lastVal, chartMax - chartMin);
    priceBadgeLineEl?.setAttribute("y1", y.toFixed(1));
    priceBadgeLineEl?.setAttribute("y2", y.toFixed(1));
    priceBadgeLineEl?.setAttribute("stroke", currentChartColor);
    priceBadgeLineEl?.setAttribute("stroke-opacity", "0.5");
    priceBadgeRectEl?.setAttribute("y", (y - 9).toFixed(1));
    priceBadgeRectEl?.setAttribute("fill", currentChartColor);
    priceBadgeTextEl?.setAttribute("y", y.toFixed(1));
    if (priceBadgeTextEl) priceBadgeTextEl.textContent = label;
  }

  function hideCrosshair(): void {
    crosshairVEl?.setAttribute("visibility", "hidden");
    crosshairHEl?.setAttribute("visibility", "hidden");
    crosshairDotEl?.setAttribute("visibility", "hidden");
    crosshairTipRectEl?.setAttribute("visibility", "hidden");
    crosshairTipPrice?.setAttribute("visibility", "hidden");
    crosshairTipDate?.setAttribute("visibility", "hidden");
  }

  function showCrosshair(
    x: number,
    y: number,
    price: number,
    ts: number | undefined,
  ): void {
    const TIP_W = 92;
    const TIP_H = 34;

    crosshairVEl?.setAttribute("x1", x.toFixed(1));
    crosshairVEl?.setAttribute("x2", x.toFixed(1));
    crosshairVEl?.setAttribute("y1", String(PAD_T));
    crosshairVEl?.setAttribute("y2", String(PAD_T + INNER_H));
    crosshairVEl?.setAttribute("visibility", "visible");

    crosshairHEl?.setAttribute("y1", y.toFixed(1));
    crosshairHEl?.setAttribute("y2", y.toFixed(1));
    crosshairHEl?.setAttribute("visibility", "visible");

    crosshairDotEl?.setAttribute("cx", x.toFixed(1));
    crosshairDotEl?.setAttribute("cy", y.toFixed(1));
    crosshairDotEl?.setAttribute("stroke", currentChartColor);
    crosshairDotEl?.setAttribute("visibility", "visible");

    const priceLabel = `$${formatYLabel(price, chartMax - chartMin)}`;
    const dateLabel =
      ts !== undefined ? formatXLabel(ts, activeRange.get()) : "";
    if (crosshairTipPrice) crosshairTipPrice.textContent = priceLabel;
    if (crosshairTipDate) crosshairTipDate.textContent = dateLabel;

    let tipX = x - TIP_W / 2;
    if (tipX < PAD_L) tipX = PAD_L;
    if (tipX + TIP_W > PAD_L + INNER_W) tipX = PAD_L + INNER_W - TIP_W;
    const tipY = y - TIP_H - 10 < PAD_T ? y + 10 : y - TIP_H - 10;

    crosshairTipRectEl?.setAttribute("x", tipX.toFixed(1));
    crosshairTipRectEl?.setAttribute("y", tipY.toFixed(1));
    crosshairTipRectEl?.setAttribute("visibility", "visible");

    crosshairTipPrice?.setAttribute("x", (tipX + TIP_W / 2).toFixed(1));
    crosshairTipPrice?.setAttribute("y", (tipY + 13).toFixed(1));
    crosshairTipPrice?.setAttribute("visibility", "visible");

    crosshairTipDate?.setAttribute("x", (tipX + TIP_W / 2).toFixed(1));
    crosshairTipDate?.setAttribute("y", (tipY + 26).toFixed(1));
    crosshairTipDate?.setAttribute("visibility", "visible");
  }

  function applyChart(
    values: readonly number[],
    timestamps: readonly number[],
    volumes: readonly number[],
    range: ChartRange,
  ): void {
    chartValues = values;
    chartTimestamps = timestamps;
    if (values.length >= 2) {
      const dMin = Math.min(...values);
      const dMax = Math.max(...values);
      const pad = (dMax - dMin) * 0.08 || dMax * 0.002;
      chartMin = dMin - pad;
      chartMax = dMax + pad;
    } else {
      chartMin = 0;
      chartMax = 1;
    }
    if (values.length >= 2) {
      const newColor =
        values[values.length - 1]! >= values[0]!
          ? "var(--beat-ui-color-success)"
          : "var(--beat-ui-color-danger)";
      currentChartColor = newColor;
      chartColor.set(newColor);
    }
    const result = buildChart(
      values,
      timestamps,
      volumes,
      currentChartColor,
      range,
    );
    chartLinePath.set(result.line);
    chartAreaPath.set(result.area);
    chartYLabels.set(
      result.yTicks
        .map(
          ({ pos, label }) =>
            `<text x="${PAD_L + INNER_W + 6}" y="${pos.toFixed(1)}" dominant-baseline="middle">${label}</text>`,
        )
        .join(""),
    );
    chartXLabels.set(
      result.xTicks
        .map(({ pos, label }, i, arr) => {
          const anchor =
            i === 0 ? "start" : i === arr.length - 1 ? "end" : "middle";
          return `<text x="${pos.toFixed(1)}" y="${PAD_T + INNER_H + 20}" text-anchor="${anchor}">${label}</text>`;
        })
        .join(""),
    );
    chartHGridLines.set(
      result.yTickYPositions
        .map(
          (y) =>
            `<line x1="${PAD_L}" x2="${PAD_L + INNER_W}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="currentColor" stroke-opacity="0.08" stroke-width="1"/>`,
        )
        .join(""),
    );
    chartVGridLines.set(
      result.xTickXPositions
        .map(
          (x) =>
            `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${PAD_T}" y2="${PAD_T + INNER_H}" stroke="currentColor" stroke-opacity="0.06" stroke-width="1"/>`,
        )
        .join(""),
    );
    chartVolumeBars.set(result.volumeBars);
    updatePriceBadge();
    sessionHighLineEl?.setAttribute("y1", result.sessionHighY.toFixed(1));
    sessionHighLineEl?.setAttribute("y2", result.sessionHighY.toFixed(1));
    sessionHighTextEl?.setAttribute("y", result.sessionHighY.toFixed(1));
    if (sessionHighTextEl)
      sessionHighTextEl.textContent = result.sessionHighLabel;
  }

  function loadRange(range: ChartRange): void {
    fetchPriceHistory(props.info.symbol, range)
      .then((points: readonly PriceHistoryPoint[]) => {
        const vals = points.map((p) => Number(p.price));
        const vols = points.map((p) => Number(p.volume24h));
        const tss = points.map((p) => new Date(p.recordedAt).getTime());
        baseVals = [...vals];
        baseTs = [...tss];
        baseVols = [...vols];
        liveLoaded.set(true);
        applyChart(baseVals, baseTs, baseVols, range);
      })
      .catch((err: unknown) => {
        console.error("[loadRange] failed:", err);
        liveLoaded.set(true);
        chartLinePath.set("");
        chartAreaPath.set("");
      });
  }

  // React to live ticks
  onCleanup(
    props.liveTick.on(({ currentValue }) => {
      if (currentValue === null) return;
      const tick = currentValue;

      const curr = Number(tick.price);
      const periodOpen = baseVals.length > 0 ? baseVals[0]! : curr;
      const goingDown = curr < periodOpen;

      const color = goingDown
        ? "var(--beat-ui-color-danger)"
        : "var(--beat-ui-color-success)";

      // Report stats to parent
      const o = periodOpen;
      const pct = o === 0 ? 0 : ((curr - o) / o) * 100;
      const sign = pct >= 0 ? "+" : "";

      props.onStatsUpdate({
        priceDisplay: `$${formatPrice(tick.price)}`,
        priceColor: color,
        sessionChange: `${sign}${pct.toFixed(2)}%`,
        changeColor:
          pct > 0
            ? "var(--beat-ui-color-success)"
            : pct < 0
              ? "var(--beat-ui-color-danger)"
              : "var(--beat-ui-color-text)",
        changeBadgeBg:
          pct > 0
            ? "rgba(16,185,129,0.15)"
            : pct < 0
              ? "rgba(239,68,68,0.15)"
              : "transparent",
        volumeDisplay: `$${(Number(tick.volume24h) / 1e6).toFixed(2)}M`,
        sourceDisplay:
          tick.source === "cex" ? "Simulated CEX" : "Simulated DEX",
      });

      if (activeRange.get() === "24h" && baseVals.length > 0) {
        const now = Date.now();
        const cutoff = now - 24 * 60 * 60 * 1000;
        baseVals = [...baseVals, curr];
        baseTs = [...baseTs, now];
        baseVols = [...baseVols, Number(tick.volume24h)];
        const firstValid = baseTs.findIndex((t) => t >= cutoff);
        if (firstValid > 0) {
          baseVals = baseVals.slice(firstValid);
          baseTs = baseTs.slice(firstValid);
          baseVols = baseVols.slice(firstValid);
        }
        applyChart(baseVals, baseTs, baseVols, "24h");
      }
    }),
  );

  const btnRefs = new Map<ChartRange, HTMLElement>();

  loadRange(activeRange.get());

  onCleanup(
    activeRange.on((e) => {
      for (const [r, btn] of btnRefs) {
        btn.className =
          e.currentValue === r
            ? (css["rangeBtnActive"] ?? "")
            : (css["rangeBtn"] ?? "");
      }
    }),
  );

  return (
    <div class={css["root"]}>
      {/* Toolbar */}
      <div class={css["toolbar"]}>
        <span class={css["toolbarLabel"]}>Price Chart</span>
        <div class={css["rangeBtnGroup"]}>
          {RANGES.map((r) => (
            <button
              type="button"
              onClick={() => {
                activeRange.set(r);
                loadRange(r);
              }}
              class={
                activeRange.get() === r
                  ? css["rangeBtnActive"]
                  : css["rangeBtn"]
              }
              ref={(node: Node) => {
                btnRefs.set(r, node as HTMLElement);
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div class={css["chartArea"]}>
        <Show
          when={liveLoaded}
          mapValue={(v) => v}
          fallback={
            <div class={css["chartLoading"]}>Generating chart data…</div>
          }
        >
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            width="100%"
            style="display:block;overflow:visible;cursor:crosshair"
            aria-hidden="true"
            ref={(node: Node) => {
              chartSvgEl = node as SVGSVGElement;
              chartSvgEl.addEventListener("mousemove", (e: MouseEvent) => {
                if (chartValues.length < 2) return;
                const svgRect = chartSvgEl!.getBoundingClientRect();
                const svgX =
                  ((e.clientX - svgRect.left) / svgRect.width) * CHART_W;
                const svgY =
                  ((e.clientY - svgRect.top) / svgRect.height) * CHART_H;
                if (
                  svgX < PAD_L ||
                  svgX > PAD_L + INNER_W ||
                  svgY < PAD_T ||
                  svgY > PAD_T + INNER_H
                ) {
                  hideCrosshair();
                  return;
                }
                const frac = (svgX - PAD_L) / INNER_W;
                const idx = Math.max(
                  0,
                  Math.min(
                    chartValues.length - 1,
                    Math.round(frac * (chartValues.length - 1)),
                  ),
                );
                const val = chartValues[idx]!;
                const ts = chartTimestamps[idx];
                const priceRange = chartMax - chartMin || 1;
                const py =
                  PAD_T + (1 - (val - chartMin) / priceRange) * INNER_H;
                showCrosshair(svgX, py, val, ts);
              });
              chartSvgEl.addEventListener("mouseleave", () => {
                hideCrosshair();
              });
            }}
          >
            <defs>
              <linearGradient
                id={gradId}
                x1="0"
                y1={String(PAD_T)}
                x2="0"
                y2={String(PAD_T + INNER_H)}
                gradientUnits="userSpaceOnUse"
              >
                <stop
                  offset="0%"
                  stop-opacity="0.35"
                  style:stop-color={chartColor}
                />
                <stop
                  offset="70%"
                  stop-opacity="0.08"
                  style:stop-color={chartColor}
                />
                <stop
                  offset="100%"
                  stop-opacity="0"
                  style:stop-color={chartColor}
                />
              </linearGradient>
            </defs>

            {/* Horizontal grid */}
            <g
              ref={(node: Node) => {
                const el = node as Element;
                el.innerHTML = chartHGridLines.get();
                onCleanup(
                  chartHGridLines.on((e) => {
                    el.innerHTML = e.currentValue;
                  }),
                );
              }}
            />

            {/* Vertical grid */}
            <g
              ref={(node: Node) => {
                const el = node as Element;
                el.innerHTML = chartVGridLines.get();
                onCleanup(
                  chartVGridLines.on((e) => {
                    el.innerHTML = e.currentValue;
                  }),
                );
              }}
            />

            {/* X-axis baseline */}
            <line
              x1={String(PAD_L)}
              x2={String(PAD_L + INNER_W)}
              y1={String(PAD_T + INNER_H)}
              y2={String(PAD_T + INNER_H)}
              stroke="currentColor"
              stroke-opacity="0.15"
              stroke-width="1"
            />

            {/* Area fill */}
            <path fill={`url(#${gradId})`} stroke="none" d={chartAreaPath} />

            {/* Line */}
            <path
              fill="none"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              d={chartLinePath}
              style:stroke={chartColor}
            />

            {/* Price badge line */}
            <line
              x1={String(PAD_L)}
              x2={String(PAD_L + INNER_W)}
              y1={String(PAD_T)}
              y2={String(PAD_T)}
              stroke="currentColor"
              stroke-width="1"
              stroke-dasharray="3,3"
              stroke-opacity="0"
              ref={(node: Node) => {
                priceBadgeLineEl = node as Element;
              }}
            />
            <rect
              x={String(PAD_L + INNER_W + 1)}
              y={String(PAD_T - 9)}
              width="58"
              height="18"
              rx="3"
              fill="var(--beat-ui-color-success)"
              ref={(node: Node) => {
                priceBadgeRectEl = node as Element;
              }}
            />
            <text
              x={String(PAD_L + INNER_W + 6)}
              y={String(PAD_T)}
              font-size="10"
              font-weight="700"
              fill="#fff"
              dominant-baseline="middle"
              ref={(node: Node) => {
                priceBadgeTextEl = node as Element;
              }}
            />

            {/* Session high */}
            <line
              x1={String(PAD_L)}
              x2={String(PAD_L + INNER_W)}
              y1={String(PAD_T)}
              y2={String(PAD_T)}
              stroke="currentColor"
              stroke-width="1"
              stroke-dasharray="3,4"
              stroke-opacity="0.35"
              ref={(node: Node) => {
                sessionHighLineEl = node as Element;
              }}
            />
            <text
              x={String(PAD_L + 4)}
              y={String(PAD_T)}
              font-size="9"
              font-weight="700"
              fill="currentColor"
              opacity="0.6"
              dominant-baseline="auto"
              dy="-3"
              ref={(node: Node) => {
                sessionHighTextEl = node as Element;
              }}
            />

            {/* Crosshair elements */}
            <line
              x1={String(PAD_L)}
              x2={String(PAD_L)}
              y1={String(PAD_T)}
              y2={String(PAD_T + INNER_H)}
              stroke="currentColor"
              stroke-width="1"
              stroke-opacity="0.3"
              visibility="hidden"
              ref={(node: Node) => {
                crosshairVEl = node as Element;
              }}
            />
            <line
              x1={String(PAD_L)}
              x2={String(PAD_L + INNER_W)}
              y1={String(PAD_T)}
              y2={String(PAD_T)}
              stroke="currentColor"
              stroke-width="1"
              stroke-opacity="0.3"
              stroke-dasharray="3,3"
              visibility="hidden"
              ref={(node: Node) => {
                crosshairHEl = node as Element;
              }}
            />
            <circle
              cx={String(PAD_L)}
              cy={String(PAD_T)}
              r="4"
              fill="var(--beat-ui-color-background)"
              stroke-width="2"
              visibility="hidden"
              ref={(node: Node) => {
                crosshairDotEl = node as Element;
              }}
            />
            <rect
              x={String(PAD_L)}
              y={String(PAD_T)}
              width="92"
              height="34"
              rx="4"
              fill="var(--beat-ui-color-background-subtle)"
              stroke="currentColor"
              stroke-opacity="0.15"
              stroke-width="1"
              visibility="hidden"
              ref={(node: Node) => {
                crosshairTipRectEl = node as Element;
              }}
            />
            <text
              x={String(PAD_L + 46)}
              y={String(PAD_T + 13)}
              font-size="10"
              font-weight="700"
              fill="currentColor"
              text-anchor="middle"
              visibility="hidden"
              ref={(node: Node) => {
                crosshairTipPrice = node as Element;
              }}
            />
            <text
              x={String(PAD_L + 46)}
              y={String(PAD_T + 26)}
              font-size="9"
              fill="currentColor"
              opacity="0.6"
              text-anchor="middle"
              visibility="hidden"
              ref={(node: Node) => {
                crosshairTipDate = node as Element;
              }}
            />

            {/* Y-axis labels */}
            <g
              font-size="10"
              fill="currentColor"
              opacity="0.55"
              text-anchor="start"
              ref={(node: Node) => {
                const el = node as Element;
                el.innerHTML = chartYLabels.get();
                onCleanup(
                  chartYLabels.on((e) => {
                    el.innerHTML = e.currentValue;
                  }),
                );
              }}
            />

            {/* X-axis labels */}
            <g
              font-size="10"
              fill="currentColor"
              opacity="0.55"
              ref={(node: Node) => {
                const el = node as Element;
                el.innerHTML = chartXLabels.get();
                onCleanup(
                  chartXLabels.on((e) => {
                    el.innerHTML = e.currentValue;
                  }),
                );
              }}
            />

            {/* Volume bars */}
            <g
              ref={(node: Node) => {
                const el = node as Element;
                el.innerHTML = chartVolumeBars.get();
                onCleanup(
                  chartVolumeBars.on((e) => {
                    el.innerHTML = e.currentValue;
                  }),
                );
              }}
            />
          </svg>
        </Show>
      </div>
    </div>
  );
});
