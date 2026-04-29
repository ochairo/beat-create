import { Show, component } from "@ochairo/beat";
import type { Pulse } from "@ochairo/pulse";
import type { LiveStatus } from "../../../../../../shared/data/fake-market-client";
import type { SymbolInfo } from "../../../../../../shared/market/market-symbols";
import css from "./detail-header.module.css";

// ── Props ──────────────────────────────────────────────────────────────────────

export interface DetailHeaderProps {
  readonly info: SymbolInfo;
  readonly status: Pulse<LiveStatus>;
  readonly onBack: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export const DetailHeader = component<DetailHeaderProps>((props) => (
  <div class={css["topBar"]}>
    <button type="button" onClick={props.onBack} class={css["backBtn"]}>
      ← Back
    </button>
    <img
      src={props.info.iconUrl}
      alt=""
      width="22"
      height="22"
      class={css["icon"]}
    />
    <span class={css["name"]}>{props.info.name}</span>
    <span class={css["symbolBadge"]}>{props.info.symbol}</span>
    <div class={css["rightSlot"]}>
      <Show
        when={props.status}
        mapValue={(s) => s === "live"}
        fallback={
          <span class={css["statusMuted"]}>
            {props.status as unknown as string}
          </span>
        }
      >
        <span class={css["statusLive"]}>
          <span class={css["statusDot"]} />
          <strong class={css["statusLiveLabel"]}>LIVE</strong>
        </span>
      </Show>
    </div>
  </div>
));
