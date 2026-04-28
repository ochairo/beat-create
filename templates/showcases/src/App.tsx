import { Outlet, component, createRouter } from "@ochairo/beat";
import { ThemeRoot, createThemeController } from "@ochairo/beat-ui";
import { AppLayout } from "./shared/layout/AppLayout.tsx";
import { CryptoPage } from "./features/crypto/presentation/CryptoPage.tsx";
import { CryptoDetailPage } from "./features/crypto-detail/presentation/CryptoDetailPage.tsx";
import { KanbanPage } from "./features/kanban/presentation/KanbanPage.tsx";
import { SpreadsheetPage } from "./features/spreadsheet/presentation/SpreadsheetPage.tsx";
import { ALL_SYMBOLS, asSymbol } from "./shared/market/market-symbols.ts";
import { createFakeKanbanApi } from "./features/kanban/data/kanban-api.ts";
import { createKanbanStore } from "./features/kanban/data/kanban-store.ts";

// ── Composition root ───────────────────────────────────────────────────────────

const themeController = createThemeController({ initialPreference: "dark" });

const symbolMap = new Map(ALL_SYMBOLS.map((s) => [s.symbol, s]));

const kanbanStore = createKanbanStore(createFakeKanbanApi());

const router = createRouter({
  routes: [
    {
      path: "/",
      redirectTo: "/crypto",
      view: () => null,
    },
    {
      path: "/crypto",
      view: () => (
        <CryptoPage
          onSelectCoin={(info) => {
            router.navigate(`/crypto/${info.symbol}`);
          }}
        />
      ),
    },
    {
      path: "/crypto/:symbol",
      view: (match) => {
        const info = symbolMap.get(asSymbol(match.params["symbol"] ?? ""));
        if (info === undefined) {
          router.navigate("/crypto", { replace: true });
          return null;
        }
        return (
          <CryptoDetailPage
            info={info}
            onBack={() => {
              router.navigate("/crypto");
            }}
          />
        );
      },
    },
    {
      path: "/kanban",
      view: () => <KanbanPage store={kanbanStore} />,
    },
    {
      path: "/spreadsheet",
      view: () => <SpreadsheetPage />,
    },
  ],
});

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
