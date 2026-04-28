import { component, onCleanup } from "@ochairo/beat";
import { type Pulse } from "@ochairo/pulse";

// ── Props ──────────────────────────────────────────────────────────────────────

export interface SideNavItem {
  readonly key: string;
  readonly label: string;
  readonly description?: string;
}

export interface SideNavProps {
  readonly items: readonly SideNavItem[];
  readonly value: Pulse<string>;
  readonly onValueChange: (key: string) => void;
}

// ── Stylesheet (injected once) ─────────────────────────────────────────────────

const STYLE_ID = "side-nav-styles";

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
    .side-nav-item {
      display: flex;
      flex-direction: column;
      gap: 0.1875rem;
      width: 100%;
      padding: 0.5rem 1rem 0.5rem 1.25rem;
      border: none;
      border-left: 3px solid transparent;
      border-radius: 0;
      background: transparent;
      color: var(--beat-ui-color-text-muted);
      font-weight: 400;
      cursor: pointer;
      font: inherit;
      text-align: left;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
      box-sizing: border-box;
    }
    .side-nav-item:hover {
      background: var(--beat-ui-color-background-elevated);
      color: var(--beat-ui-color-text);
    }
    .side-nav-item[aria-current="page"] {
      border-left-color: var(--beat-ui-color-primary);
      background: var(--beat-ui-color-background-accent-soft);
      color: var(--beat-ui-color-primary);
      font-weight: 600;
    }
  `;
  document.head.appendChild(el);
}

// ── Component ──────────────────────────────────────────────────────────────────

const descStyle = ["font-size:0.75rem", "opacity:0.7", "font-weight:400"].join(
  ";",
);

export const SideNav = component<SideNavProps>((props) => {
  ensureStyles();

  const buttonRefs = new Map<string, HTMLButtonElement>();

  const syncActive = (activeKey: string): void => {
    for (const item of props.items) {
      const btn = buttonRefs.get(item.key);
      if (!btn) continue;
      if (item.key === activeKey) {
        btn.setAttribute("aria-current", "page");
      } else {
        btn.removeAttribute("aria-current");
      }
    }
  };

  onCleanup(
    props.value.on(({ currentValue }) => {
      syncActive(currentValue);
    }),
  );

  return (
    <nav
      style="display:flex;flex-direction:column"
      aria-label="Main navigation"
    >
      {props.items.map((item) => (
        <button
          type="button"
          class="side-nav-item"
          aria-current={item.key === props.value.get() ? "page" : undefined}
          ref={(node) => {
            if (node instanceof HTMLButtonElement) {
              buttonRefs.set(item.key, node);
            }
          }}
          onclick={() => {
            props.onValueChange(item.key);
          }}
        >
          <span style="font-size:0.9375rem">{item.label}</span>
          {item.description !== undefined ? (
            <span style={descStyle}>{item.description}</span>
          ) : null}
        </button>
      ))}
    </nav>
  );
});
