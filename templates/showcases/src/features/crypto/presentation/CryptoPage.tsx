import { Show, component, onCleanup, type BeatJsxChild } from "@ochairo/beat";
import { pulse, type Pulse } from "@ochairo/pulse";
import {
  SparkLine,
  Table,
  type TableColumn,
  type TableRow,
} from "@ochairo/beat-ui";
import {
  createFakeLiveMarketClient,
  type LivePriceTick,
} from "../../../shared/data/fake-market-client.ts";
import {
  ALL_SYMBOLS,
  TOP_SYMBOLS,
  asSymbol,
  type Symbol,
  type SymbolInfo,
} from "../../../shared/market/market-symbols.ts";

// ── Module-level derived lookups ───────────────────────────────────────────────

const symbolInfoMap = new Map(ALL_SYMBOLS.map((s) => [s.symbol, s]));
const symbolOrder = new Map(ALL_SYMBOLS.map((s, i) => [s.symbol, i]));

// ── Formatting helpers ─────────────────────────────────────────────────────────

function formatPrice(raw: string): string {
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

function formatVolume(raw: string): string {
  const n = Number(raw);
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function computeSessionChange(current: string, open: string): string {
  const c = Number(current);
  const o = Number(open);
  if (o === 0) return "—";
  const pct = ((c - o) / o) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

// ── Per-symbol reactive state ──────────────────────────────────────────────────

const MAX_HISTORY = 3600;

interface SymbolPulses {
  readonly price: Pulse<unknown>;
  readonly change: Pulse<unknown>;
  readonly positive: Pulse<boolean>;
  readonly loaded: Pulse<boolean>;
  readonly history: Pulse<readonly number[]>;
}

function createSymbolPulses(): SymbolPulses {
  return {
    price: pulse<unknown>("—"),
    change: pulse<unknown>("—"),
    positive: pulse(true),
    loaded: pulse(false),
    history: pulse<readonly number[]>([]),
  };
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const pageStyle = [
  "display:flex",
  "flex-direction:column",
  "gap:1.5rem",
  "padding:1.5rem",
  "overflow-y:auto",
  "height:100%",
  "box-sizing:border-box",
].join(";");

const headingRowStyle = [
  "display:flex",
  "align-items:center",
  "justify-content:space-between",
  "flex-wrap:wrap",
  "gap:0.75rem",
].join(";");

const statusBarStyle = [
  "display:flex",
  "align-items:center",
  "gap:1.25rem",
  "padding:0.5rem 1rem",
  "background:var(--beat-ui-color-background-elevated)",
  "border:1px solid var(--beat-ui-color-border)",
  "border-radius:0.5rem",
  "font-size:0.8125rem",
].join(";");

const dotBase = [
  "display:inline-block",
  "width:0.5rem",
  "height:0.5rem",
  "border-radius:50%",
  "margin-right:0.375rem",
  "vertical-align:middle",
].join(";");

const tickerGridStyle = [
  "display:grid",
  "grid-template-columns:repeat(4,1fr)",
  "gap:1rem",
].join(";");

const cardStyle = [
  "padding:1.25rem 1.5rem",
  "background:var(--beat-ui-color-background-elevated)",
  "border:1px solid var(--beat-ui-color-border)",
  "border-radius:0.75rem",
  "display:flex",
  "flex-direction:column",
  "gap:0.375rem",
  "min-width:0",
  "overflow:hidden",
].join(";");

const placeholderCardStyle = [cardStyle, "opacity:0.45"].join(";");

// ── TickerCard sub-components ──────────────────────────────────────────────────

interface TickerCardProps {
  readonly base: string;
  readonly name: string;
  readonly iconUrl: string;
  readonly pricePulse: Pulse<unknown>;
  readonly changePulse: Pulse<unknown>;
  readonly positivePulse: Pulse<boolean>;
  readonly loadedPulse: Pulse<boolean>;
  readonly historyPulse: Pulse<readonly number[]>;
}

function placeholderContent(props: TickerCardProps): BeatJsxChild {
  return (
    <div style={placeholderCardStyle}>
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.125rem">
        <img
          src={props.iconUrl}
          alt=""
          width="20"
          height="20"
          style="flex-shrink:0"
        />
        <div style="display:flex;align-items:baseline;gap:0.375rem">
          <span style="font-weight:700;font-size:1rem">{props.base}</span>
          <span style="font-size:0.75rem;color:var(--beat-ui-color-text-muted)">
            / USD
          </span>
        </div>
      </div>
      <div style="font-size:0.75rem;color:var(--beat-ui-color-text-muted)">
        {props.name}
      </div>
      <div style="font-size:1.75rem;font-weight:700;color:var(--beat-ui-color-text-muted)">
        —
      </div>
      <div style="font-size:0.875rem;color:var(--beat-ui-color-text-muted)">
        Connecting…
      </div>
    </div>
  );
}

function liveContent(props: TickerCardProps): BeatJsxChild {
  return (
    <div style={cardStyle}>
      <div style="display:flex;align-items:flex-start;gap:0.75rem;min-width:0">
        {/* ── Left: text info ── */}
        <div style="display:flex;flex-direction:column;gap:0.375rem;flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.125rem">
            <img
              src={props.iconUrl}
              alt=""
              width="20"
              height="20"
              style="flex-shrink:0"
            />
            <div style="display:flex;align-items:baseline;gap:0.375rem">
              <span style="font-weight:700;font-size:1rem">{props.base}</span>
              <span style="font-size:0.75rem;color:var(--beat-ui-color-text-muted)">
                / USD
              </span>
            </div>
          </div>
          <div style="font-size:0.75rem;color:var(--beat-ui-color-text-muted)">
            {props.name}
          </div>
          <div style="font-size:1.5rem;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-0.02em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            {props.pricePulse}
          </div>
          <Show
            when={props.positivePulse}
            mapValue={(p) => p}
            fallback={
              <span style="color:var(--beat-ui-color-danger);font-weight:600;font-size:0.875rem">
                {props.changePulse}
              </span>
            }
          >
            <span style="color:var(--beat-ui-color-success);font-weight:600;font-size:0.875rem">
              {props.changePulse}
            </span>
          </Show>
        </div>
        {/* ── Right: sparkline ── */}
        <div style="flex:0 0 55%;min-width:0;align-self:stretch;display:flex;align-items:center">
          <SparkLine
            values={props.historyPulse}
            positive={props.positivePulse}
            height={56}
          />
        </div>
      </div>
    </div>
  );
}

const TickerCard = component<TickerCardProps>((props) => (
  <Show
    when={props.loadedPulse}
    mapValue={(loaded) => loaded}
    fallback={placeholderContent(props)}
  >
    {liveContent(props)}
  </Show>
));

// ── Table columns ──────────────────────────────────────────────────────────────

const TABLE_COLUMNS: readonly TableColumn[] = [
  {
    key: "symbol",
    header: "Symbol",
    sortable: true,
    headerAlign: "center",
    width: "7rem",
    renderCell: (row) => (
      <span style="display:flex;align-items:center;gap:0.5rem">
        <img
          src={row["iconUrl"] as string}
          alt=""
          width="18"
          height="18"
          style="flex-shrink:0"
        />
        <span style="font-weight:700;font-family:monospace;font-size:0.875rem">
          {row["symbol"] as string}
        </span>
      </span>
    ),
  },
  {
    key: "name",
    header: "Name",
    sortable: true,
    headerAlign: "center",
    width: "8rem",
  },
  {
    key: "price",
    header: "Price",
    align: "right",
    headerAlign: "center",
    sortable: true,
    width: "14rem",
    renderCell: (row) => {
      const dir = row["direction"] as "up" | "down" | "same";
      const color =
        dir === "up"
          ? "var(--beat-ui-color-success)"
          : dir === "down"
            ? "var(--beat-ui-color-danger)"
            : "var(--beat-ui-color-text)";
      const arrow = dir === "up" ? " ▲" : dir === "down" ? " ▼" : "";
      return (
        <span
          style={`font-weight:600;font-variant-numeric:tabular-nums;color:${color}`}
        >
          ${row["priceDisplay"] as string}
          {arrow}
        </span>
      );
    },
  },
  {
    key: "volume",
    header: "Volume 24h",
    align: "right",
    headerAlign: "center",
  },
  {
    key: "source",
    header: "Source",
    align: "center",
    headerAlign: "center",
    renderCell: (row) => {
      const src = row["source"] as string;
      return (
        <span style="padding:0.125rem 0.5rem;border-radius:0.25rem;font-size:0.75rem;font-weight:700;background:var(--beat-ui-color-background-subtle);color:var(--beat-ui-color-text-muted);text-transform:uppercase;letter-spacing:0.05em">
          {src}
        </span>
      );
    },
  },
  {
    key: "updated",
    header: "Last Update",
    align: "right",
    headerAlign: "center",
  },
  {
    key: "chart",
    header: "Trend",
    align: "center",
    headerAlign: "center",
    width: "14rem",
    renderCell: (row) => {
      const histPulse = row["chartPulse"] as
        | Pulse<readonly number[]>
        | undefined;
      const posPulse = row["positivePulse"] as Pulse<boolean> | undefined;
      if (histPulse === undefined) {
        return (
          <span style="color:var(--beat-ui-color-text-muted);font-size:0.75rem">
            —
          </span>
        );
      }
      return (
        <SparkLine
          values={histPulse}
          {...(posPulse !== undefined ? { positive: posPulse } : {})}
          width={180}
          height={36}
        />
      );
    },
  },
];

// ── Page props ─────────────────────────────────────────────────────────────────

export interface CryptoPageProps {
  readonly onSelectCoin: (info: SymbolInfo) => void;
}

interface EntrySnapshot {
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

function buildSnapshot(
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

// ── Page component ────────────────────────────────────────────────────────────

export const CryptoPage = component<CryptoPageProps>((props) => {
  const client = createFakeLiveMarketClient();

  const openPrices = new Map<string, string>();
  const prevPrices = new Map<string, string>();
  const entrySnapshots = new Map<string, EntrySnapshot>();

  const symbolPulses = new Map<string, SymbolPulses>(
    TOP_SYMBOLS.map((info) => [info.symbol, createSymbolPulses()]),
  );

  const priceHistories = new Map<string, Pulse<readonly number[]>>(
    ALL_SYMBOLS.map((info) => [info.symbol, pulse<readonly number[]>([])]),
  );
  const positivePulses = new Map<string, Pulse<boolean>>(
    ALL_SYMBOLS.map((info) => [info.symbol, pulse(true)]),
  );

  const tableRows = pulse<readonly TableRow[]>([]);

  const statusDisplayPulse = client.status as unknown as Pulse<unknown>;
  const ticksDisplayPulse = client.totalTicks as unknown as Pulse<unknown>;

  const unsubscribeTick = client.onTick((tick) => {
    const sym = asSymbol(tick.symbol);
    const info = symbolInfoMap.get(sym);
    if (!info) return;

    if (!openPrices.has(sym)) openPrices.set(sym, tick.price);
    const openPrice = openPrices.get(sym) as string;
    const prevPrice = prevPrices.get(sym);
    prevPrices.set(sym, tick.price);

    const snapshot = buildSnapshot(tick, info, openPrice, prevPrice);
    entrySnapshots.set(sym, snapshot);

    const histPulse = priceHistories.get(sym);
    if (histPulse !== undefined) {
      const prev = histPulse.get();
      const next =
        prev.length >= MAX_HISTORY
          ? [...prev.slice(1), snapshot.price]
          : [...prev, snapshot.price];
      histPulse.set(next);
    }

    const posPulse = positivePulses.get(sym);
    if (posPulse !== undefined) {
      posPulse.set(!snapshot.session.startsWith("-"));
    }

    const sp = symbolPulses.get(sym);
    if (sp) {
      sp.price.set(`$${snapshot.priceDisplay}`);
      sp.change.set(snapshot.session);
      sp.positive.set(!snapshot.session.startsWith("-"));
      sp.loaded.set(true);
      const h = priceHistories.get(sym);
      if (h !== undefined) sp.history.set(h.get());
    }

    const rows = [...entrySnapshots.values()]
      .sort(
        (a, b) =>
          (symbolOrder.get(a.symbol) ?? 999) -
          (symbolOrder.get(b.symbol) ?? 999),
      )
      .map(
        (e): TableRow => ({
          symbol: e.symbol,
          name: e.name,
          iconUrl: e.iconUrl,
          price: e.price,
          priceDisplay: e.priceDisplay,
          session: e.session,
          volume: e.volume,
          source: e.source,
          direction: e.direction,
          updated: e.updated,
          chartPulse: priceHistories.get(e.symbol),
          positivePulse: positivePulses.get(e.symbol),
        }),
      );
    tableRows.set(rows);
  });

  onCleanup(() => {
    unsubscribeTick();
    client.close();
  });

  const tickerItems = TOP_SYMBOLS.map((info) => ({
    info,
    pulses: symbolPulses.get(info.symbol)!,
    iconUrl: info.iconUrl,
  }));

  return (
    <div style={pageStyle}>
      {/* ── Header ── */}
      <div style={headingRowStyle}>
        <h2 style="margin:0;font-size:1.25rem;font-weight:700">
          Market Overview
        </h2>

        <div style={statusBarStyle}>
          <Show
            when={client.status}
            mapValue={(s) => s === "live"}
            fallback={
              <span style="display:flex;align-items:center;gap:0.25rem">
                <span
                  style={`${dotBase};background:var(--beat-ui-color-text-muted)`}
                />
                <span style="color:var(--beat-ui-color-text-muted)">
                  {statusDisplayPulse}
                </span>
              </span>
            }
          >
            <span style="display:flex;align-items:center;gap:0.25rem">
              <span
                style={`${dotBase};background:var(--beat-ui-color-success)`}
              />
              <strong style="color:var(--beat-ui-color-success)">LIVE</strong>
            </span>
          </Show>

          <span style="color:var(--beat-ui-color-text-muted)">
            {ticksDisplayPulse} ticks
          </span>

          <span style="color:var(--beat-ui-color-text-muted);font-size:0.75rem;padding:0.125rem 0.5rem;background:var(--beat-ui-color-background-subtle);border-radius:0.25rem">
            Simulated Feed
          </span>
        </div>
      </div>

      {/* ── Ticker cards ── */}
      <div style={tickerGridStyle}>
        {tickerItems.map(({ info, pulses, iconUrl }) => (
          <TickerCard
            base={info.symbol}
            name={info.name}
            iconUrl={iconUrl}
            pricePulse={pulses.price}
            changePulse={pulses.change}
            positivePulse={pulses.positive}
            loadedPulse={pulses.loaded}
            historyPulse={pulses.history}
          />
        ))}
      </div>

      {/* ── Live prices table ── */}
      <div style="display:flex;flex-direction:column;gap:0.75rem">
        <h3 style="margin:0;font-size:0.875rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--beat-ui-color-text-muted)">
          Live Prices
        </h3>
        <Table
          columns={TABLE_COLUMNS}
          rows={tableRows}
          onRowClick={(row: TableRow) => {
            const info = symbolInfoMap.get(row["symbol"] as Symbol);
            if (info !== undefined) props.onSelectCoin(info);
          }}
          emptyState={
            <div style="padding:3rem;text-align:center;color:var(--beat-ui-color-text-muted)">
              Waiting for market data…
            </div>
          }
        />
      </div>
    </div>
  );
});
