import { pulse, type Pulse } from "@ochairo/pulse";
import { ALL_SYMBOLS } from "../market/market-symbols.ts";

// ── Types ──────────────────────────────────────────────────────────────────────

export type LiveStatus = "connecting" | "live" | "error" | "closed";

export interface LivePriceTick {
  readonly symbol: string;
  readonly price: string;
  readonly volume24h: string;
  readonly source: "cex" | "dex";
  readonly timestamp: number;
}

export interface LiveMarketClient {
  readonly status: Pulse<LiveStatus>;
  readonly totalTicks: Pulse<number>;
  onTick(handler: (tick: LivePriceTick) => void): () => void;
  close(): void;
}

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

// ── Factory ────────────────────────────────────────────────────────────────────

export function createFakeLiveMarketClient(): LiveMarketClient {
  const status = pulse<LiveStatus>("connecting");
  const totalTicks = pulse(0);
  const handlers: Array<(tick: LivePriceTick) => void> = [];

  const prices = new Map<string, number>(
    ALL_SYMBOLS.map((s) => [s.symbol, BASE_PRICES[s.symbol] ?? 1.0]),
  );
  const volumes = new Map<string, number>(
    ALL_SYMBOLS.map((s) => [s.symbol, 1e8 + Math.random() * 9e8]),
  );

  let symbolIndex = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let connectTimeoutId: ReturnType<typeof setTimeout> | null = null;

  connectTimeoutId = setTimeout(() => {
    status.set("live");

    intervalId = setInterval(() => {
      const sym = ALL_SYMBOLS[symbolIndex % ALL_SYMBOLS.length];
      if (sym === undefined) return;
      symbolIndex += 1;

      const base = prices.get(sym.symbol) ?? 1;
      const variation = base * (Math.random() * 0.008 - 0.004);
      const newPrice = Math.max(base * 0.01, base + variation);
      prices.set(sym.symbol, newPrice);

      const vol = volumes.get(sym.symbol) ?? 1e8;
      const newVol = Math.max(1e7, vol + (Math.random() - 0.5) * 1e7);
      volumes.set(sym.symbol, newVol);

      const priceStr =
        newPrice < 1
          ? newPrice.toFixed(6)
          : newPrice < 100
            ? newPrice.toFixed(4)
            : newPrice.toFixed(2);

      const tick: LivePriceTick = {
        symbol: sym.symbol,
        price: priceStr,
        volume24h: Math.floor(newVol).toFixed(0),
        source: "cex",
        timestamp: Date.now(),
      };

      totalTicks.set(totalTicks.get() + 1);
      for (const h of handlers) h(tick);
    }, 250);
  }, 600);

  return {
    status,
    totalTicks,
    onTick(handler: (tick: LivePriceTick) => void): () => void {
      handlers.push(handler);
      return () => {
        const idx = handlers.indexOf(handler);
        if (idx >= 0) handlers.splice(idx, 1);
      };
    },
    close(): void {
      if (connectTimeoutId !== null) clearTimeout(connectTimeoutId);
      if (intervalId !== null) clearInterval(intervalId);
      status.set("closed");
    },
  };
}
