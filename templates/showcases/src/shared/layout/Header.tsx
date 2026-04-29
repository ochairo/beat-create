import { component, onCleanup } from "@ochairo/beat";
import { pulse } from "@ochairo/pulse";
import { Switch } from "@ochairo/beat-ui";
import type { BeatUiThemeController } from "@ochairo/beat-ui";

// ── Props ──────────────────────────────────────────────────────────────────────

export interface HeaderProps {
  readonly themeController: BeatUiThemeController;
  readonly onMenuClick: () => void;
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const headerStyle = [
  "display:flex",
  "align-items:center",
  "justify-content:space-between",
  "padding:0 1.5rem",
  "height:3.5rem",
  "background:var(--beat-ui-color-background-elevated)",
  "border-bottom:1px solid var(--beat-ui-color-border)",
  "flex-shrink:0",
].join(";");

const hamburgerStyle = [
  "display:flex",
  "flex-direction:column",
  "justify-content:center",
  "gap:5px",
  "width:2.25rem",
  "height:2.25rem",
  "padding:0.375rem",
  "background:none",
  "border:none",
  "border-radius:0.375rem",
  "cursor:pointer",
  "color:var(--beat-ui-color-text)",
  "flex-shrink:0",
].join(";");

const barStyle = [
  "display:block",
  "width:100%",
  "height:2px",
  "background:currentColor",
  "border-radius:2px",
  "transition:opacity 0.15s",
].join(";");

const logoStyle = [
  "display:flex",
  "align-items:center",
  "gap:0.5rem",
  "font-size:1.125rem",
  "font-weight:700",
  "color:var(--beat-ui-color-primary)",
  "letter-spacing:-0.02em",
].join(";");

const actionsStyle = [
  "display:flex",
  "align-items:center",
  "gap:0.625rem",
].join(";");

const labelStyle = [
  "font-size:0.75rem",
  "color:var(--beat-ui-color-text-muted)",
  "user-select:none",
].join(";");

// ── Component ──────────────────────────────────────────────────────────────────

export const Header = component<HeaderProps>((props) => {
  const isDark = pulse(props.themeController.mode.get() === "dark");

  const stopSync = props.themeController.mode.on(({ currentValue }) => {
    isDark.set(currentValue === "dark");
  });

  onCleanup(stopSync);

  return (
    <header style={headerStyle}>
      <div style="display:flex;align-items:center;gap:0.75rem">
        <button
          style={hamburgerStyle}
          onclick={() => {
            props.onMenuClick();
          }}
          aria-label="Toggle sidebar"
        >
          <span style={barStyle} />
          <span style={barStyle} />
          <span style={barStyle} />
        </button>
        <div style={logoStyle}>
          <span>◈</span>
          <span>Beat Showcase</span>
        </div>
      </div>
      <div style={actionsStyle}>
        <span style={labelStyle}>Light</span>
        <Switch
          checked={isDark}
          onCheckedChange={() => {
            props.themeController.toggleMode();
          }}
          ariaLabel="Toggle dark mode"
        />
        <span style={labelStyle}>Dark</span>
      </div>
    </header>
  );
});
