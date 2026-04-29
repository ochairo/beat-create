import { component } from "@ochairo/beat";
import { pulse } from "@ochairo/pulse";

const counter = pulse(0);

export const App = component(() => {
  return (
    <main class="app-shell">
      <section class="workspace">
        <header class="workspace-header">
          <div>
            <p class="eyebrow brand-mark">
              <span aria-hidden="true" class="brand-mark__dot" />
              Beat starter
            </p>
            <h1 class="workspace-title">Counter app</h1>
            <p class="workspace-copy">A small app with room to grow.</p>
          </div>
        </header>
        <section class="panel panel--route">
          <section class="route-stack">
            <p class="eyebrow">Counter</p>
            <h2>Counter</h2>
            <div class="panel panel--nested">
              <div class="counter-panel">
                <span class="counter-panel__label">Count</span>
                <div class="counter-stepper">
                  <button
                    class="counter-stepper__button"
                    onClick={() => counter.set(counter.get() - 1)}
                  >
                    -
                  </button>
                  <strong class="counter-stepper__value">{counter}</strong>
                  <button
                    class="counter-stepper__button"
                    onClick={() => counter.set(counter.get() + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
});
