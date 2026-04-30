import {
  component,
  createRouter,
  Outlet,
  type BeatJsxChild,
} from "@ochairo/beat";
import type { BeatUiThemeController } from "@ochairo/beat-ui";

import { Layout } from "./layout/Layout";
import { HomePage } from "./pages/HomePage";
import { ComponentsPage } from "./pages/ComponentsPage";

interface AppProps {
  readonly theme: BeatUiThemeController;
}

const router = createRouter({
  routes: [
    { path: "/", view: () => <HomePage /> },
    { path: "/components", view: () => <ComponentsPage /> },
  ],
});

export const App = component<AppProps>(
  (props): BeatJsxChild => (
    <Layout router={router} theme={props.theme}>
      <Outlet router={router} />
    </Layout>
  ),
);
