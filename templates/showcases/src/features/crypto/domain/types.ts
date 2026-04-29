export interface CryptoAsset {
  readonly id: string;
  readonly symbol: string;
  readonly name: string;
  readonly price: string;
  readonly change24h: string;
  readonly marketCap: string;
  readonly volume24h: string;
}

export interface PortfolioStats {
  readonly totalValue: string;
  readonly change24h: string;
  readonly changePercent24h: string;
  readonly activePositions: number;
  readonly watchlistCount: number;
}

// ── Chart types (detail view) ─────────────────────────────────────────────────

export type ChartRange = "24h" | "1w" | "1m" | "6m" | "1y";

export interface PriceHistoryPoint {
  readonly price: string;
  readonly volume24h: string;
  readonly recordedAt: string;
}
