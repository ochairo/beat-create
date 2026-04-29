import type { ChartRange } from "../../../domain/types";

// ── Chart geometry constants ──────────────────────────────────────────────────

export const CHART_W = 600;
export const CHART_H = 260;
export const PAD_T = 28;
export const PAD_B = 48;
export const PAD_L = 8;
export const PAD_R = 64;
export const INNER_W = CHART_W - PAD_L - PAD_R;
export const INNER_H = CHART_H - PAD_T - PAD_B;

export const VOL_H = 28;
export const VOL_TOP = PAD_T + INNER_H + 4;

export const RANGES: readonly ChartRange[] = ["24h", "1w", "1m", "6m", "1y"];

// ── Formatting helpers ────────────────────────────────────────────────────────

export function formatPrice(raw: string): string {
  const n = Number(raw);
  if (n >= 1_000)
    return n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

export function formatVolume(raw: string): string {
  const n = Number(raw);
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

export function formatYLabel(v: number, priceRange?: number): string {
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

export function formatXLabel(ts: number, range: ChartRange): string {
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

// ── Chart math ────────────────────────────────────────────────────────────────

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

// ── Axis tick type ────────────────────────────────────────────────────────────

export interface AxisTick {
  readonly pos: number;
  readonly label: string;
}

// ── Build chart result ────────────────────────────────────────────────────────

export interface ChartResult {
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

export function buildChart(
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
  const firstTickVal = Math.ceil((dataMin - step * 0.01) / step) * step;
  const lastTickVal = Math.floor((dataMax + step * 0.01) / step) * step;
  const yTicks: AxisTick[] = [];
  for (let v = firstTickVal; v <= lastTickVal + step * 1e-9; v += step) {
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
