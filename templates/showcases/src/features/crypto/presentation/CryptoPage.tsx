import { Show, component, onCleanup } from "@ochairo/beat";
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
} from "../../../shared/data/fake-market-client";
import {
  ALL_SYMBOLS,
  TOP_SYMBOLS,
  asSymbol,
  type Symbol,
  type SymbolInfo,
} from "../../../shared/market/market-symbols";
import {
  MAX_HISTORY,
  buildSnapshot,
  createSymbolPulses,
  type EntrySnapshot,
  type SymbolPulses,
} from "./components/crypto-helpers";
import { TickerCard } from "./components/ticker-card/TickerCard";
import css from "./crypto-page.module.css";

// ── Module-level derived lookups ───────────────────────────────────────────────

const symbolInfoMap = new Map(ALL_SYMBOLS.map((s) => [s.symbol, s]));
const symbolOrder = new Map(ALL_SYMBOLS.map((s, i) => [s.symbol, i]));

// ── Table columns ──────────────────────────────────────────────────────────────

const TABLE_COLUMNS: readonly TableColumn[] = [
  {
    key: "symbol",
    header: "Symbol",
    sortable: true,
    headerAlign: "center",
    width: "7rem",
    renderCell: (row) => (
      <span class={css["cellSymbolRow"]}>
        <img
          src={row["iconUrl"] as string}
          alt=""
          width="18"
          height="18"
          class={css["cellSymbolIcon"]}
        />
        <span class={css["cellSymbolText"]}>{row["symbol"] as string}</span>
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
        <span class={css["cellPrice"]} style={`color:${color}`}>
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
    renderCell: (row) => (
      <span class={css["cellSourceBadge"]}>{row["source"] as string}</span>
    ),
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
        return <span class={css["cellTrendEmpty"]}>—</span>;
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

// ── Page component ─────────────────────────────────────────────────────────────

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

  const unsubscribeTick = client.onTick((tick: LivePriceTick) => {
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
    <div class={css["page"]}>
      {/* ── Header ── */}
      <div class={css["headingRow"]}>
        <h2 class={css["heading"]}>Market Overview</h2>

        <div class={css["statusBar"]}>
          <Show
            when={client.status}
            mapValue={(s) => s === "live"}
            fallback={
              <span class={css["statusIndicator"]}>
                <span class={css["statusDotMuted"]} />
                <span class={css["statusMutedLabel"]}>
                  {statusDisplayPulse}
                </span>
              </span>
            }
          >
            <span class={css["statusIndicator"]}>
              <span class={css["statusDotLive"]} />
              <strong class={css["statusLiveLabel"]}>LIVE</strong>
            </span>
          </Show>

          <span class={css["statusTicks"]}>{ticksDisplayPulse} ticks</span>

          <span class={css["statusBadge"]}>Simulated Feed</span>
        </div>
      </div>

      {/* ── Ticker cards ── */}
      <div class={css["tickerGrid"]}>
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
      <div class={css["tableSection"]}>
        <h3 class={css["tableHeading"]}>Live Prices</h3>
        <Table
          columns={TABLE_COLUMNS}
          rows={tableRows}
          onRowClick={(row: TableRow) => {
            const info = symbolInfoMap.get(row["symbol"] as Symbol);
            if (info !== undefined) props.onSelectCoin(info);
          }}
          emptyState={
            <div class={css["emptyState"]}>Waiting for market data…</div>
          }
        />
      </div>
    </div>
  );
});
