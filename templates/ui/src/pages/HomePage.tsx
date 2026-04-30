import { component } from "@ochairo/beat";

import styles from "./HomePage.module.css";

export const HomePage = component(() => (
  <div class={styles["hero"]}>
    <h1>
      <span class={styles["highlight"]}>Beat</span>
    </h1>
    <h2>Pulse-native JSX framework</h2>
    <p>
      Direct-DOM rendering with fine-grained reactivity. Explicit routing and
      async primitives. No virtual DOM.
    </p>
  </div>
));
