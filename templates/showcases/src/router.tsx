import { CryptoPage } from "./features/crypto/presentation/CryptoPage";
import { CryptoDetailPage } from "./features/crypto/presentation/detail/CryptoDetailPage";
import { KanbanPage } from "./features/kanban/presentation/KanbanPage";
import { SpreadsheetPage } from "./features/spreadsheet/presentation/SpreadsheetPage";
import { ALL_SYMBOLS, asSymbol } from "./shared/market/market-symbols";
import { createFakeKanbanApi } from "./features/kanban/data/kanban-api";
import { createKanbanStore } from "./features/kanban/data/kanban-store";
import { BeatRouteMatch } from "@ochairo/beat";

// ── Composition root ───────────────────────────────────────────────────────────

const symbolMap = new Map(ALL_SYMBOLS.map((s) => [s.symbol, s]));
const kanbanStore = createKanbanStore(createFakeKanbanApi());
export const routes = [
  {
    path: "/",
    redirectTo: "/crypto",
    view: () => null,
  },
  {
    path: "/crypto",
    view: (match: BeatRouteMatch) => (
      <CryptoPage
        onSelectCoin={(info) => {
          match.navigate(`/crypto/${info.symbol}`);
        }}
      />
    ),
  },
  {
    path: "/crypto/:symbol",
    view: (match: BeatRouteMatch) => {
      const info = symbolMap.get(asSymbol(match.params["symbol"] ?? ""));
      if (info === undefined) {
        match.navigate("/crypto", { replace: true });
        return null;
      }
      return (
        <CryptoDetailPage
          info={info}
          onBack={() => {
            match.navigate("/crypto");
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
] as const;
