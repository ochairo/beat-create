import { render } from "@ochairo/beat";
import { ThemeRoot, createThemeController } from "@ochairo/beat-ui";
import "@ochairo/beat-ui/style.css";

import { App } from "./App";
import "./styles.css";

const theme = createThemeController({ initialPreference: "system" });

theme.applyTo(document.documentElement);

render(
  document.getElementById("root")!,
  <ThemeRoot controller={theme}>
    <App theme={theme} />
  </ThemeRoot>,
);
