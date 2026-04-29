import { Show, component, type BeatJsxChild } from "@ochairo/beat";
import { SparkLine } from "@ochairo/beat-ui";
import type { Pulse } from "@ochairo/pulse";
import css from "./ticker-card.module.css";

// ── Props ──────────────────────────────────────────────────────────────────────

export interface TickerCardProps {
  readonly base: string;
  readonly name: string;
  readonly iconUrl: string;
  readonly pricePulse: Pulse<unknown>;
  readonly changePulse: Pulse<unknown>;
  readonly positivePulse: Pulse<boolean>;
  readonly loadedPulse: Pulse<boolean>;
  readonly historyPulse: Pulse<readonly number[]>;
}

// ── Sub-views ──────────────────────────────────────────────────────────────────

function placeholderContent(props: TickerCardProps): BeatJsxChild {
  return (
    <div class={css["placeholderCard"]}>
      <div class={css["symbolRow"]}>
        <img
          src={props.iconUrl}
          alt=""
          width="20"
          height="20"
          class={css["symbolIcon"]}
        />
        <div class={css["symbolTextRow"]}>
          <span class={css["symbolBase"]}>{props.base}</span>
          <span class={css["symbolQuote"]}>/ USD</span>
        </div>
      </div>
      <div class={css["coinName"]}>{props.name}</div>
      <div class={css["placeholderPrice"]}>—</div>
      <div class={css["connecting"]}>Connecting…</div>
    </div>
  );
}

function liveContent(props: TickerCardProps): BeatJsxChild {
  return (
    <div class={css["card"]}>
      <div class={css["cardContent"]}>
        <div class={css["textArea"]}>
          <div class={css["symbolRow"]}>
            <img
              src={props.iconUrl}
              alt=""
              width="20"
              height="20"
              class={css["symbolIcon"]}
            />
            <div class={css["symbolTextRow"]}>
              <span class={css["symbolBase"]}>{props.base}</span>
              <span class={css["symbolQuote"]}>/ USD</span>
            </div>
          </div>
          <div class={css["coinName"]}>{props.name}</div>
          <div class={css["priceValue"]}>{props.pricePulse}</div>
          <Show
            when={props.positivePulse}
            mapValue={(p) => p}
            fallback={
              <span class={css["changeNegative"]}>{props.changePulse}</span>
            }
          >
            <span class={css["changePositive"]}>{props.changePulse}</span>
          </Show>
        </div>
        <div class={css["sparkArea"]}>
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

// ── Component ──────────────────────────────────────────────────────────────────

export const TickerCard = component<TickerCardProps>((props) => (
  <Show
    when={props.loadedPulse}
    mapValue={(loaded) => loaded}
    fallback={placeholderContent(props)}
  >
    {liveContent(props)}
  </Show>
));
