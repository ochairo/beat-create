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
