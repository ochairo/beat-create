import { component, type BeatJsxChild } from "@ochairo/beat";
import type { Pulse } from "@ochairo/pulse";
import type { SymbolInfo } from "../../../../../../shared/market/market-symbols";
import css from "./stat-panel.module.css";

// ── Props ──────────────────────────────────────────────────────────────────────

export interface StatPanelProps {
  readonly info: SymbolInfo;
  readonly priceDisplay: Pulse<string>;
  readonly priceColor: Pulse<string>;
  readonly sessionChange: Pulse<string>;
  readonly changeColor: Pulse<string>;
  readonly changeBadgeBg: Pulse<string>;
  readonly volumeDisplay: Pulse<string>;
  readonly sourceDisplay: Pulse<string>;
}

// ── Component ──────────────────────────────────────────────────────────────────

export const StatPanel = component<StatPanelProps>((props) => {
  function StatRow(
    label: string,
    valuePulse: Pulse<string>,
    colorPulse?: Pulse<string>,
  ): BeatJsxChild {
    return (
      <div class={css["statRow"]}>
        <span class={css["statLabel"]}>{label}</span>
        <span class={css["statValue"]} style:color={colorPulse}>
          {valuePulse}
        </span>
      </div>
    );
  }

  return (
    <div class={css["panel"]}>
      <div class={css["coinHeader"]}>
        <img
          src={props.info.iconUrl}
          alt=""
          width="44"
          height="44"
          class={css["coinIcon"]}
        />
        <div>
          <div class={css["coinName"]}>{props.info.name}</div>
          <div class={css["coinPair"]}>{props.info.symbol} / USDT</div>
        </div>
      </div>

      <div>
        <div class={css["priceDisplay"]} style:color={props.priceColor}>
          {props.priceDisplay}
        </div>
        <div>
          <span
            class={css["changeBadge"]}
            style:color={props.changeColor}
            style:background-color={props.changeBadgeBg}
          >
            {props.sessionChange}
            <span class={css["changeBadgeSessionLabel"]}>(session)</span>
          </span>
        </div>
      </div>

      <div class={css["statsColumn"]}>
        {StatRow("Volume 24h", props.volumeDisplay)}
        {StatRow("Source", props.sourceDisplay)}
      </div>
    </div>
  );
});
