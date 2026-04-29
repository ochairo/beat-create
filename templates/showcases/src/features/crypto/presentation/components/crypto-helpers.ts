import { pulse, type Pulse } from "@ochairo/pulse";
import type { LivePriceTick } from "../../../../shared/data/fake-market-client";
import type { Symbol } from "../../../../shared/market/market-symbols";

// ── Formatting helpers ─────────────────────────────────────────────────────────

export function formatPrice(raw: string): string {
  const n = Number(raw);
  if (n >= 1_000) {
    return n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
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

export function computeSessionChange(current: string, open: string): string {
  const c = Number(current);
  const o = Number(open);
  if (o === 0) return "—";
  const pct = ((c - o) / o) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

// ── Per-symbol reactive state ──────────────────────────────────────────────────

export const MAX_HISTORY = 3600;

export interface SymbolPulses {
  readonly price: Pulse<unknown>;
  readonly change: Pulse<unknown>;
  readonly positive: Pulse<boolean>;
  readonly loaded: Pulse<boolean>;
  readonly history: Pulse<readonly number[]>;
}

export function createSymbolPulses(): SymbolPulses {
  return {
    price: pulse<unknown>("—"),
    change: pulse<unknown>("—"),
    positive: pulse(true),
    loaded: pulse(false),
    history: pulse<readonly number[]>([]),
  };
}

// ── Snapshot ────────────────────────────────────────────────────────────────────

export interface EntrySnapshot {
  symbol: Symbol;
  name: string;
  iconUrl: string;
  price: number;
  priceDisplay: string;
  session: string;
  volume: string;
  source: "cex" | "dex";
  direction: "up" | "down" | "same";
  updated: string;
}

export function buildSnapshot(
  tick: LivePriceTick,
  info: {
    readonly symbol: Symbol;
    readonly name: string;
    readonly iconUrl: string;
  },
  openPrice: string,
  prevPrice: string | undefined,
): EntrySnapshot {
  const curr = Number(tick.price);
  const prev = prevPrice !== undefined ? Number(prevPrice) : curr;
  const direction: "up" | "down" | "same" =
    prevPrice === undefined
      ? "same"
      : curr > prev
        ? "up"
        : curr < prev
          ? "down"
          : "same";

  return {
    symbol: info.symbol,
    name: info.name,
    iconUrl: info.iconUrl,
    price: curr,
    priceDisplay: formatPrice(tick.price),
    session: computeSessionChange(tick.price, openPrice),
    volume: formatVolume(tick.volume24h),
    source: tick.source,
    direction,
    updated: new Date().toLocaleTimeString(),
  };
}
