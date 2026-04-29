import type { ChartRange, PriceHistoryPoint } from "../domain/types";

// ── Base prices ────────────────────────────────────────────────────────────────

const BASE_PRICES: Record<string, number> = {
  BTC: 94000,
  ETH: 1800,
  BNB: 600,
  SOL: 148,
  XRP: 0.52,
  DOGE: 0.185,
  ADA: 0.44,
  TRX: 0.245,
  AVAX: 22,
  LINK: 14,
  MATIC: 0.35,
  DOT: 6.5,
  UNI: 7.8,
  LTC: 88,
  BCH: 390,
  ATOM: 4.8,
  NEAR: 2.9,
  ARB: 0.42,
  OP: 0.92,
  SUI: 1.15,
};

// ── Range config ───────────────────────────────────────────────────────────────

const RANGE_CONFIG: Record<ChartRange, { points: number; rangeMs: number }> = {
  "24h": { points: 288, rangeMs: 24 * 3600 * 1000 },
  "1w": { points: 168, rangeMs: 7 * 24 * 3600 * 1000 },
  "1m": { points: 180, rangeMs: 30 * 24 * 3600 * 1000 },
  "6m": { points: 180, rangeMs: 180 * 24 * 3600 * 1000 },
  "1y": { points: 365, rangeMs: 365 * 24 * 3600 * 1000 },
};

// ── Generator ─────────────────────────────────────────────────────────────────

function generateHistory(
  basePrice: number,
  points: number,
  rangeMs: number,
): PriceHistoryPoint[] {
  const now = Date.now();
  const startMs = now - rangeMs;
  const stepMs = rangeMs / (points - 1);
  let price = basePrice * (0.88 + Math.random() * 0.24);
  return Array.from({ length: points }, (_, i) => {
    const drift = price * (Math.random() * 0.03 - 0.015);
    price = Math.max(price * 0.01, price + drift);
    const priceStr =
      price < 1
        ? price.toFixed(6)
        : price < 100
          ? price.toFixed(4)
          : price.toFixed(2);
    return {
      price: priceStr,
      volume24h: Math.floor(1e8 + Math.random() * 9e8).toFixed(0),
      recordedAt: new Date(startMs + i * stepMs).toISOString(),
    };
  });
}

// ── Fetcher ────────────────────────────────────────────────────────────────────

export async function fetchPriceHistory(
  symbol: string,
  range: ChartRange,
): Promise<readonly PriceHistoryPoint[]> {
  await new Promise<void>((resolve) => setTimeout(resolve, 300));
  const basePrice = BASE_PRICES[symbol] ?? 1.0;
  const { points, rangeMs } = RANGE_CONFIG[range];
  return generateHistory(basePrice, points, rangeMs);
}
