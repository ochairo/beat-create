import { Outlet, component, createRouter } from "@ochairo/beat";
import { ThemeRoot, createThemeController } from "@ochairo/beat-ui";
import { AppLayout } from "./shared/layout/AppLayout";
import { routes } from "./router";

const themeController = createThemeController({ initialPreference: "dark" });
const router = createRouter({ routes });

export const App = component(() => (
  <ThemeRoot controller={themeController}>
    <AppLayout
      themeController={themeController}
      router={router}
      onNavigate={(key) => {
        router.navigate(`/${key}`);
      }}
    >
      <Outlet router={router} />
    </AppLayout>
  </ThemeRoot>
));
