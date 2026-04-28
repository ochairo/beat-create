export type ChartRange = "24h" | "1w" | "1m" | "6m" | "1y";

export interface PriceHistoryPoint {
  readonly price: string;
  readonly volume24h: string;
  readonly recordedAt: string;
}
