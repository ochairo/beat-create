import { component, onCleanup, type BeatRouter } from "@ochairo/beat";
import { pulse } from "@ochairo/pulse";
import type { BeatUiRenderable, BeatUiThemeController } from "@ochairo/beat-ui";
import { Header } from "./Header";
import { SideNav } from "./SideNav";

// ── Props ──────────────────────────────────────────────────────────────────────

export interface AppLayoutProps {
  readonly themeController: BeatUiThemeController;
  readonly router: BeatRouter;
  readonly onNavigate: (key: string) => void;
  readonly children?: BeatUiRenderable;
}

// ── Navigation items ───────────────────────────────────────────────────────────

const MENU_ITEMS = [
  {
    key: "crypto",
    label: "Crypto",
    description: "Market overview",
  },
  {
    key: "kanban",
    label: "Kanban",
    description: "Project board & Gantt",
  },
  {
    key: "spreadsheet",
    label: "Spreadsheet",
    description: "Online Excel table",
  },
];

// ── Styles ─────────────────────────────────────────────────────────────────────

const appStyle = [
  "display:flex",
  "flex-direction:column",
  "height:100vh",
  "background:var(--beat-ui-color-background)",
  "color:var(--beat-ui-color-text)",
  "font-family:inherit",
].join(";");

const bodyStyle = ["display:flex", "flex:1", "overflow:hidden"].join(";");

const SIDEBAR_WIDTH = "15rem";

function getSidebarStyle(open: boolean): string {
  return [
    "display:flex",
    "flex-direction:column",
    "flex-shrink:0",
    "overflow:hidden",
    `width:${open ? SIDEBAR_WIDTH : "0"}`,
    "transition:width 0.25s ease",
  ].join(";");
}

const sidebarInnerStyle = [
  `width:${SIDEBAR_WIDTH}`,
  "height:100%",
  "padding:0.75rem 0",
  "box-sizing:border-box",
  "background:var(--beat-ui-color-background-subtle)",
  "border-right:1px solid var(--beat-ui-color-border)",
  "overflow-y:auto",
].join(";");

const contentStyle = [
  "flex:1",
  "overflow:hidden",
  "position:relative",
  "display:flex",
  "flex-direction:column",
].join(";");

function getOverlayStyle(open: boolean): string {
  return [
    "position:absolute",
    "inset:0",
    "background:rgba(0,0,0,0.4)",
    "z-index:10",
    `opacity:${open ? "1" : "0"}`,
    `pointer-events:${open ? "auto" : "none"}`,
    "transition:opacity 0.25s ease",
  ].join(";");
}

// ── Component ──────────────────────────────────────────────────────────────────

export const AppLayout = component<AppLayoutProps>((props) => {
  const sidebarOpen = pulse(false);
  let asideEl: HTMLElement | null = null;
  let overlayEl: HTMLElement | null = null;

  const pathToKey = (path: string): string => {
    const parts = path.split("/");
    const first = parts[1] ?? "crypto";
    if (first === "crypto" && parts[2] !== undefined) return "";
    return first;
  };
  const activePage = pulse(pathToKey(props.router.current.get().path));
  onCleanup(
    props.router.current.on(({ currentValue }) => {
      activePage.set(pathToKey(currentValue.path));
    }),
  );

  onCleanup(
    sidebarOpen.on(({ currentValue }) => {
      asideEl?.setAttribute("style", getSidebarStyle(currentValue));
      overlayEl?.setAttribute("style", getOverlayStyle(currentValue));
    }),
  );

  return (
    <div style={appStyle}>
      <Header
        themeController={props.themeController}
        onMenuClick={() => {
          sidebarOpen.set(!sidebarOpen.get());
        }}
      />
      <div style={bodyStyle}>
        <aside
          style={getSidebarStyle(false)}
          ref={(node) => {
            if (node instanceof HTMLElement) asideEl = node;
          }}
        >
          <div style={sidebarInnerStyle}>
            <SideNav
              items={MENU_ITEMS}
              value={activePage}
              onValueChange={(key) => {
                sidebarOpen.set(false);
                props.onNavigate(key);
              }}
            />
          </div>
        </aside>
        <main
          style={contentStyle}
          onClick={() => {
            if (sidebarOpen.get()) sidebarOpen.set(false);
          }}
        >
          <div
            style={getOverlayStyle(false)}
            ref={(node) => {
              if (node instanceof HTMLElement) overlayEl = node;
            }}
          />
          {props.children}
        </main>
      </div>
    </div>
  );
});
