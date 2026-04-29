import { component, onCleanup } from "@ochairo/beat";
import { pulse } from "@ochairo/pulse";
import {
  createFakeLiveMarketClient,
  type LivePriceTick,
} from "../../../../shared/data/fake-market-client";
import type { SymbolInfo } from "../../../../shared/market/market-symbols";
import { DetailHeader } from "./components/detail-header/DetailHeader";
import { StatPanel } from "./components/stat-panel/StatPanel";
import { PriceChart } from "./components/price-chart/PriceChart";
import css from "./crypto-detail-page.module.css";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CryptoDetailPageProps {
  readonly info: SymbolInfo;
  readonly onBack: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const CryptoDetailPage = component<CryptoDetailPageProps>((props) => {
  const client = createFakeLiveMarketClient();

  // Stat panel pulses
  const priceDisplay = pulse("—");
  const sessionChange = pulse("—");
  const volumeDisplay = pulse("—");
  const sourceDisplay = pulse("—");
  const priceColor = pulse("var(--beat-ui-color-text)");
  const changeColor = pulse("var(--beat-ui-color-text)");
  const changeBadgeBg = pulse("transparent");

  // Live tick forwarding
  const liveTick = pulse<LivePriceTick | null>(null);

  const unsubscribe = client.onTick((tick: LivePriceTick) => {
    if (tick.symbol !== props.info.symbol) return;
    liveTick.set(tick);
  });

  onCleanup(() => {
    unsubscribe();
    client.close();
  });

  function handleStatsUpdate(stats: {
    priceDisplay: string;
    priceColor: string;
    sessionChange: string;
    changeColor: string;
    changeBadgeBg: string;
    volumeDisplay: string;
    sourceDisplay: string;
  }): void {
    priceDisplay.set(stats.priceDisplay);
    priceColor.set(stats.priceColor);
    sessionChange.set(stats.sessionChange);
    changeColor.set(stats.changeColor);
    changeBadgeBg.set(stats.changeBadgeBg);
    volumeDisplay.set(stats.volumeDisplay);
    sourceDisplay.set(stats.sourceDisplay);
  }

  return (
    <div class={css["page"]}>
      <DetailHeader
        info={props.info}
        status={client.status}
        onBack={props.onBack}
      />

      <div class={css["body"]}>
        <StatPanel
          info={props.info}
          priceDisplay={priceDisplay}
          priceColor={priceColor}
          sessionChange={sessionChange}
          changeColor={changeColor}
          changeBadgeBg={changeBadgeBg}
          volumeDisplay={volumeDisplay}
          sourceDisplay={sourceDisplay}
        />

        <PriceChart
          info={props.info}
          liveTick={liveTick}
          onStatsUpdate={handleStatsUpdate}
        />
      </div>
    </div>
  );
});
