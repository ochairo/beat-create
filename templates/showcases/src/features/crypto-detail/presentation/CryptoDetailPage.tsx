import { Show, component, onCleanup } from "@ochairo/beat";
import { pulse } from "@ochairo/pulse";
import {
  createFakeLiveMarketClient,
  type LivePriceTick,
} from "../../../shared/data/fake-market-client.ts";
import {
  fetchPriceHistory,
  type ChartRange,
  type PriceHistoryPoint,
} from "../data/fake-history-client.ts";
import type { SymbolInfo } from "../../../shared/market/market-symbols.ts";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CryptoDetailPageProps {
  readonly info: SymbolInfo;
  readonly onBack: () => void;
}

// ── Chart geometry ────────────────────────────────────────────────────────────

const CHART_W = 600;
const CHART_H = 260;
const PAD_T = 28;
const PAD_B = 48;
const PAD_L = 8;
const PAD_R = 64;
const INNER_W = CHART_W - PAD_L - PAD_R;
const INNER_H = CHART_H - PAD_T - PAD_B;

const VOL_H = 28;
const VOL_TOP = PAD_T + INNER_H + 4;

const RANGES: readonly ChartRange[] = ["24h", "1w", "1m", "6m", "1y"];

// ── Formatting ────────────────────────────────────────────────────────────────

function formatPrice(raw: string): string {
  const n = Number(raw);
  if (n >= 1_000)
    return n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

function formatVolume(raw: string): string {
  const n = Number(raw);
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function formatYLabel(v: number, priceRange?: number): string {
  const step = (priceRange ?? v * 0.01) / 4;
  if (v >= 1_000_000) {
    const stepM = step / 1_000_000;
    const d = stepM < 0.001 ? 4 : stepM < 0.01 ? 3 : stepM < 0.1 ? 2 : 1;
    return `${(v / 1_000_000).toFixed(d)}M`;
  }
  if (v >= 1_000) {
    const stepK = step / 1_000;
    const d =
      stepK < 0.001
        ? 4
        : stepK < 0.01
          ? 3
          : stepK < 0.1
            ? 2
            : stepK < 1
              ? 1
              : 0;
    return `${(v / 1_000).toFixed(d)}K`;
  }
  if (v >= 1) {
    const d = step < 0.01 ? 4 : step < 0.1 ? 3 : 2;
    return v.toFixed(d);
  }
  return v.toFixed(6);
}

function formatXLabel(ts: number, range: ChartRange): string {
  const d = new Date(ts);
  if (range === "24h") {
    if (d.getHours() === 0 && d.getMinutes() === 0) {
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    }
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (range === "1w") {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  if (range === "1m" || range === "6m") {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  if (range === "1y") {
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short" });
  }
  return d.toLocaleDateString(undefined, { year: "numeric" });
}

// ── Chart path + axis builder ─────────────────────────────────────────────────

const MAX_DISPLAY_PTS = 300;

function niceStep(range: number, targetTicks = 5): number {
  if (range === 0) return 1;
  const rawStep = range / (targetTicks - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

function downsample(
  values: readonly number[],
  timestamps: readonly number[],
  maxPts: number,
): {
  readonly values: readonly number[];
  readonly timestamps: readonly number[];
} {
  const n = values.length;
  if (n <= maxPts) return { values, timestamps };
  const vs: number[] = [];
  const ts: number[] = [];
  vs.push(values[0]!);
  ts.push(timestamps[0]!);
  for (let i = 1; i < maxPts - 1; i++) {
    const idx = Math.round((i / (maxPts - 1)) * (n - 1));
    vs.push(values[idx]!);
    ts.push(timestamps[idx]!);
  }
  vs.push(values[n - 1]!);
  ts.push(timestamps[n - 1]!);
  return { values: vs, timestamps: ts };
}

interface Pt {
  readonly x: number;
  readonly y: number;
}

function buildSmoothPath(pts: readonly Pt[]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0]!.x.toFixed(1)},${pts[0]!.y.toFixed(1)}`;
  if (n === 2)
    return `M${pts[0]!.x.toFixed(1)},${pts[0]!.y.toFixed(1)} L${pts[1]!.x.toFixed(1)},${pts[1]!.y.toFixed(1)}`;
  const t = 0.18;
  let d = `M${pts[0]!.x.toFixed(1)},${pts[0]!.y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(n - 1, i + 2)]!;
    const cp1x = p1.x + (p2.x - p0.x) * t;
    const cp1y = p1.y + (p2.y - p0.y) * t;
    const cp2x = p2.x - (p3.x - p1.x) * t;
    const cp2y = p2.y - (p3.y - p1.y) * t;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function niceXTicks(
  tsMin: number,
  tsMax: number,
  range: ChartRange,
): readonly number[] {
  const spanMs = tsMax - tsMin;
  if (spanMs <= 0) return [];

  if (range === "24h") {
    const stepH = 3;
    const ticks: number[] = [];
    const d = new Date(tsMin);
    d.setMinutes(0, 0, 0);
    const startH = d.getHours();
    const nextAlignedH = (Math.floor(startH / stepH) + 1) * stepH;
    d.setHours(nextAlignedH);
    while (d.getTime() <= tsMax) {
      ticks.push(d.getTime());
      d.setHours(d.getHours() + stepH);
    }
    if (ticks.length === 0) {
      return Array.from({ length: 5 }, (_, i) =>
        Math.round(tsMin + (i / 4) * spanMs),
      );
    }
    if (ticks.length > 8) {
      const every = Math.ceil(ticks.length / 8);
      return ticks.filter((_, i) => i % every === 0);
    }
    return ticks;
  }

  let stepMs: number;
  if (range === "1w") {
    stepMs = 24 * 60 * 60 * 1000;
  } else if (range === "1m") {
    stepMs = 5 * 24 * 60 * 60 * 1000;
  } else if (range === "6m") {
    stepMs = 30 * 24 * 60 * 60 * 1000;
  } else {
    stepMs = 60 * 24 * 60 * 60 * 1000;
  }

  const fallback = (): readonly number[] =>
    Array.from({ length: 5 }, (_, i) => Math.round(tsMin + (i / 4) * spanMs));

  if (stepMs >= spanMs) return fallback();

  const firstTick = Math.ceil(tsMin / stepMs) * stepMs;
  const ticks: number[] = [];
  for (let t = firstTick; t <= tsMax; t += stepMs) {
    ticks.push(t);
  }

  if (ticks.length === 0) return fallback();

  if (ticks.length > 8) {
    const every = Math.ceil(ticks.length / 8);
    return ticks.filter((_, i) => i % every === 0);
  }
  return ticks;
}

interface AxisTick {
  readonly pos: number;
  readonly label: string;
}

interface ChartResult {
  readonly line: string;
  readonly area: string;
  readonly yTicks: readonly AxisTick[];
  readonly xTicks: readonly AxisTick[];
  readonly sessionHighY: number;
  readonly sessionHighLabel: string;
  readonly xTickXPositions: readonly number[];
  readonly yTickYPositions: readonly number[];
  readonly volumeBars: string;
}

function buildChart(
  values: readonly number[],
  timestamps: readonly number[],
  volumes: readonly number[],
  color: string,
  range: ChartRange,
): ChartResult {
  const empty: ChartResult = {
    line: "",
    area: "",
    yTicks: [],
    xTicks: [],
    sessionHighY: PAD_T,
    sessionHighLabel: "",
    xTickXPositions: [],
    yTickYPositions: [],
    volumeBars: "",
  };
  if (values.length < 2) return empty;

  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const dataPad = (dataMax - dataMin) * 0.08 || dataMax * 0.002;
  const min = dataMin - dataPad;
  const max = dataMax + dataPad;
  const priceRange = max - min || 1;

  const { values: dv } = downsample(values, timestamps, MAX_DISPLAY_PTS);

  const toX = (i: number): number => PAD_L + (i / (dv.length - 1)) * INNER_W;
  const toY = (v: number): number =>
    PAD_T + (1 - (v - min) / priceRange) * INNER_H;

  const coordPts: Pt[] = dv.map((v, i) => ({ x: toX(i), y: toY(v) }));
  const line = buildSmoothPath(coordPts);
  const lastPt = coordPts[coordPts.length - 1]!;
  const firstPt = coordPts[0]!;
  const bottom = (PAD_T + INNER_H).toFixed(1);
  const area = `${line} L${lastPt.x.toFixed(1)},${bottom} L${firstPt.x.toFixed(1)},${bottom} Z`;

  const dataRange = dataMax - dataMin || 1;
  const step = niceStep(dataRange);
  const firstTick = Math.ceil((dataMin - step * 0.01) / step) * step;
  const lastTick = Math.floor((dataMax + step * 0.01) / step) * step;
  const yTicks: AxisTick[] = [];
  for (let v = firstTick; v <= lastTick + step * 1e-9; v += step) {
    yTicks.push({ pos: toY(v), label: formatYLabel(v, step * 4) });
  }

  const sessionHighY = toY(dataMax);
  const sessionHighLabel = formatYLabel(dataMax, dataRange);

  const tsMin = timestamps[0]!;
  const tsMax = timestamps[timestamps.length - 1]!;
  const niceTs = niceXTicks(tsMin, tsMax, range);
  const tsSpan = tsMax - tsMin || 1;
  const xTicks: AxisTick[] = niceTs.map((ts) => {
    const xPos = PAD_L + ((ts - tsMin) / tsSpan) * INNER_W;
    return { pos: xPos, label: formatXLabel(ts, range) };
  });
  const xTickXPositions = xTicks.map((t) => t.pos);
  const yTickYPositions = yTicks.map((t) => t.pos);

  const { values: dvolumes } = downsample(volumes, timestamps, MAX_DISPLAY_PTS);
  const volMin = Math.min(...dvolumes);
  const volMax = Math.max(...dvolumes) - volMin || 1;
  const barW = Math.max(1, (INNER_W / dvolumes.length) * 0.7);
  const volumeBars = dvolumes
    .map((v, i) => {
      const x = toX(i);
      const barH = Math.max(1, ((v - volMin) / volMax) * (VOL_H - 2) + 2);
      const y = VOL_TOP + VOL_H - barH;
      return `<rect x="${(x - barW / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${color}" fill-opacity="0.35" rx="1"/>`;
    })
    .join("");

  return {
    line,
    area,
    yTicks,
    xTicks,
    sessionHighY,
    sessionHighLabel,
    xTickXPositions,
    yTickYPositions,
    volumeBars,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export const CryptoDetailPage = component<CryptoDetailPageProps>((props) => {
  const client = createFakeLiveMarketClient();

  const priceDisplay = pulse("—");
  const sessionChange = pulse("—");
  const volumeDisplay = pulse("—");
  const sourceDisplay = pulse("—");
  const priceColor = pulse("var(--beat-ui-color-text)");
  const changeColor = pulse("var(--beat-ui-color-text)");
  const changeBadgeBg = pulse("transparent");
  const liveLoaded = pulse(false);

  const activeRange = pulse<ChartRange>("24h");
  const chartLinePath = pulse("");
  const chartAreaPath = pulse("");
  const chartColor = pulse("var(--beat-ui-color-success)");
  const chartYLabels = pulse("");
  const chartXLabels = pulse("");
  const chartHGridLines = pulse("");
  const chartVGridLines = pulse("");
  const chartVolumeBars = pulse("");

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

  const unsubscribe = client.onTick((tick: LivePriceTick) => {
    if (tick.symbol !== props.info.symbol) return;

    const curr = Number(tick.price);
    const periodOpen = baseVals.length > 0 ? baseVals[0]! : curr;
    const goingDown = curr < periodOpen;

    const color = goingDown
      ? "var(--beat-ui-color-danger)"
      : "var(--beat-ui-color-success)";

    priceDisplay.set(`$${formatPrice(tick.price)}`);
    priceColor.set(color);
    volumeDisplay.set(formatVolume(tick.volume24h));
    sourceDisplay.set(
      tick.source === "cex" ? "Simulated CEX" : "Simulated DEX",
    );

    if (baseVals.length > 0) {
      const o = periodOpen;
      const pct = o === 0 ? 0 : ((curr - o) / o) * 100;
      const sign = pct >= 0 ? "+" : "";
      sessionChange.set(`${sign}${pct.toFixed(2)}%`);
      changeColor.set(
        pct > 0
          ? "var(--beat-ui-color-success)"
          : pct < 0
            ? "var(--beat-ui-color-danger)"
            : "var(--beat-ui-color-text)",
      );
      changeBadgeBg.set(
        pct > 0
          ? "rgba(16,185,129,0.15)"
          : pct < 0
            ? "rgba(239,68,68,0.15)"
            : "transparent",
      );
    }

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
  });

  onCleanup(() => {
    unsubscribe();
    client.close();
  });

  const StatRow = (
    label: string,
    valuePulse: ReturnType<typeof pulse<string>>,
    colorPulse?: ReturnType<typeof pulse<string>>,
  ) => (
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:0.5rem 0;border-bottom:1px solid var(--beat-ui-color-border)">
      <span style="font-size:0.75rem;color:var(--beat-ui-color-text-muted)">
        {label}
      </span>
      <span
        style="font-size:0.8125rem;font-weight:600;font-variant-numeric:tabular-nums;text-align:right"
        style:color={colorPulse}
      >
        {valuePulse}
      </span>
    </div>
  );

  const btnRefs = new Map<ChartRange, HTMLElement>();

  loadRange(activeRange.get());

  function btnStyle(active: boolean): string {
    return (
      `border-radius:0.3125rem;padding:0.1875rem 0.5625rem;cursor:pointer;` +
      `font-size:0.75rem;font-weight:600;` +
      `border:1px solid ${active ? "var(--beat-ui-color-primary)" : "var(--beat-ui-color-border)"};` +
      `background:${active ? "var(--beat-ui-color-primary)" : "transparent"};` +
      `color:${active ? "#fff" : "var(--beat-ui-color-text-muted)"}`
    );
  }

  onCleanup(
    activeRange.on((e) => {
      for (const [r, btn] of btnRefs) {
        btn.style.cssText = btnStyle(e.currentValue === r);
      }
    }),
  );

  const RangeBtn = (r: ChartRange) => (
    <button
      type="button"
      onClick={() => {
        activeRange.set(r);
        loadRange(r);
      }}
      style={btnStyle(activeRange.get() === r)}
      ref={(node: Node) => {
        btnRefs.set(r, node as HTMLElement);
      }}
    >
      {r}
    </button>
  );

  return (
    <div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
      {/* Top bar */}
      <div style="display:flex;align-items:center;gap:0.75rem;padding:0.625rem 1.25rem;border-bottom:1px solid var(--beat-ui-color-border);flex-shrink:0;background:var(--beat-ui-color-background-subtle)">
        <button
          type="button"
          onClick={props.onBack}
          style="background:none;border:1px solid var(--beat-ui-color-border);border-radius:0.375rem;padding:0.25rem 0.625rem;cursor:pointer;color:var(--beat-ui-color-text);font-size:0.8125rem;line-height:1.5"
        >
          ← Back
        </button>
        <img
          src={props.info.iconUrl}
          alt=""
          width="22"
          height="22"
          style="flex-shrink:0"
        />
        <span style="font-weight:700;font-size:0.9375rem">
          {props.info.name}
        </span>
        <span style="font-size:0.6875rem;color:var(--beat-ui-color-text-muted);background:var(--beat-ui-color-background);border:1px solid var(--beat-ui-color-border);border-radius:0.25rem;padding:0.125rem 0.4375rem;font-weight:600">
          {props.info.symbol}
        </span>
        <div style="margin-left:auto">
          <Show
            when={client.status}
            mapValue={(s) => s === "live"}
            fallback={
              <span style="font-size:0.75rem;color:var(--beat-ui-color-text-muted)">
                {client.status as unknown as string}
              </span>
            }
          >
            <span style="display:inline-flex;align-items:center;gap:0.375rem;font-size:0.75rem">
              <span style="width:6px;height:6px;border-radius:50%;background:var(--beat-ui-color-success);display:inline-block" />
              <strong style="color:var(--beat-ui-color-success)">LIVE</strong>
            </span>
          </Show>
        </div>
      </div>

      {/* Body */}
      <div style="display:flex;flex:1;overflow:hidden">
        {/* Left panel */}
        <div style="width:15.5rem;flex-shrink:0;border-right:1px solid var(--beat-ui-color-border);overflow-y:auto;padding:1.25rem;display:flex;flex-direction:column;gap:1.25rem;box-sizing:border-box">
          <div style="display:flex;align-items:center;gap:0.875rem">
            <img
              src={props.info.iconUrl}
              alt=""
              width="44"
              height="44"
              style="flex-shrink:0;border-radius:50%"
            />
            <div>
              <div style="font-size:1.0625rem;font-weight:800;line-height:1.25">
                {props.info.name}
              </div>
              <div style="font-size:0.75rem;color:var(--beat-ui-color-text-muted);font-weight:500;margin-top:0.125rem">
                {props.info.symbol} / USDT
              </div>
            </div>
          </div>

          <div>
            <div
              style="font-size:1.875rem;font-weight:800;font-variant-numeric:tabular-nums;line-height:1.15;letter-spacing:-0.02em"
              style:color={priceColor}
            >
              {priceDisplay}
            </div>
            <div style="margin-top:0.5rem">
              <span
                style="display:inline-block;font-size:0.8125rem;font-weight:700;padding:0.1875rem 0.5625rem;border-radius:0.375rem;font-variant-numeric:tabular-nums"
                style:color={changeColor}
                style:background-color={changeBadgeBg}
              >
                {sessionChange}
                <span style="font-size:0.6875rem;font-weight:400;opacity:0.75;margin-left:0.25rem">
                  (session)
                </span>
              </span>
            </div>
          </div>

          <div style="display:flex;flex-direction:column">
            {StatRow("Volume 24h", volumeDisplay)}
            {StatRow("Source", sourceDisplay)}
          </div>
        </div>

        {/* Right chart panel */}
        <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0">
          {/* Toolbar */}
          <div style="display:flex;align-items:center;justify-content:space-between;padding:0.625rem 1.25rem;border-bottom:1px solid var(--beat-ui-color-border);flex-shrink:0;gap:0.5rem">
            <span style="font-size:0.8125rem;font-weight:600;color:var(--beat-ui-color-text-muted)">
              Price Chart
            </span>
            <div style="display:flex;gap:0.25rem">
              {RANGES.map((r) => RangeBtn(r))}
            </div>
          </div>

          {/* Chart */}
          <div style="padding:0.5rem 0 0.5rem 1.25rem;overflow:visible">
            <Show
              when={liveLoaded}
              mapValue={(v) => v}
              fallback={
                <div style="height:100%;display:flex;align-items:center;justify-content:center;color:var(--beat-ui-color-text-muted);font-size:0.875rem">
                  Generating chart data…
                </div>
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

                <line
                  x1={String(PAD_L)}
                  x2={String(PAD_L + INNER_W)}
                  y1={String(PAD_T + INNER_H)}
                  y2={String(PAD_T + INNER_H)}
                  stroke="currentColor"
                  stroke-opacity="0.15"
                  stroke-width="1"
                />

                <path
                  fill={`url(#${gradId})`}
                  stroke="none"
                  d={chartAreaPath}
                />

                <path
                  fill="none"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d={chartLinePath}
                  style:stroke={chartColor}
                />

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
      </div>
    </div>
  );
});
