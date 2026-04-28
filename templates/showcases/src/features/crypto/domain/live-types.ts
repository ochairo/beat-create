export interface LivePriceEntry {
  readonly symbol: string;
  readonly baseSymbol: string;
  readonly displayName: string;
  readonly currentPrice: number;
  readonly openPrice: number;
  readonly prevPrice: number;
  readonly sessionChangePct: number;
  readonly direction: "up" | "down" | "same";
  readonly volume24h: number;
  readonly source: "cex" | "dex";
  readonly lastUpdated: number;
}
