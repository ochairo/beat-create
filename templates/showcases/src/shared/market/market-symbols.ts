// ── Symbol type ────────────────────────────────────────────────────────────────

declare const SYMBOL_BRAND: unique symbol;
export type Symbol = string & { readonly [SYMBOL_BRAND]: true };

export function asSymbol(raw: string): Symbol {
  return raw as Symbol;
}

// ── SymbolInfo ─────────────────────────────────────────────────────────────────

export interface SymbolInfo {
  readonly symbol: Symbol;
  readonly name: string;
  readonly iconUrl: string;
}

// ── Icon helper ────────────────────────────────────────────────────────────────

const icon = (id: string): string =>
  `https://assets.coincap.io/assets/icons/${id}@2x.png`;

// ── Registry ───────────────────────────────────────────────────────────────────

export const ALL_SYMBOLS: readonly SymbolInfo[] = [
  { symbol: asSymbol("BTC"), name: "Bitcoin", iconUrl: icon("btc") },
  { symbol: asSymbol("ETH"), name: "Ethereum", iconUrl: icon("eth") },
  { symbol: asSymbol("BNB"), name: "BNB", iconUrl: icon("bnb") },
  { symbol: asSymbol("SOL"), name: "Solana", iconUrl: icon("sol") },
  { symbol: asSymbol("XRP"), name: "XRP", iconUrl: icon("xrp") },
  { symbol: asSymbol("DOGE"), name: "Dogecoin", iconUrl: icon("doge") },
  { symbol: asSymbol("ADA"), name: "Cardano", iconUrl: icon("ada") },
  { symbol: asSymbol("TRX"), name: "TRON", iconUrl: icon("trx") },
  { symbol: asSymbol("AVAX"), name: "Avalanche", iconUrl: icon("avax") },
  { symbol: asSymbol("LINK"), name: "Chainlink", iconUrl: icon("link") },
  { symbol: asSymbol("MATIC"), name: "Polygon", iconUrl: icon("matic") },
  { symbol: asSymbol("DOT"), name: "Polkadot", iconUrl: icon("dot") },
  { symbol: asSymbol("UNI"), name: "Uniswap", iconUrl: icon("uni") },
  { symbol: asSymbol("LTC"), name: "Litecoin", iconUrl: icon("ltc") },
  { symbol: asSymbol("BCH"), name: "Bitcoin Cash", iconUrl: icon("bch") },
  { symbol: asSymbol("ATOM"), name: "Cosmos", iconUrl: icon("atom") },
  { symbol: asSymbol("NEAR"), name: "NEAR Protocol", iconUrl: icon("near") },
  { symbol: asSymbol("ARB"), name: "Arbitrum", iconUrl: icon("arb") },
  { symbol: asSymbol("OP"), name: "Optimism", iconUrl: icon("op") },
  { symbol: asSymbol("SUI"), name: "Sui", iconUrl: icon("sui") },
];

export const TOP_SYMBOLS: readonly SymbolInfo[] = ALL_SYMBOLS.slice(0, 8);
