import {
  component,
  Link,
  type BeatJsxChild,
  type BeatRouter,
} from "@ochairo/beat";
import { derived } from "@ochairo/pulse";
import {
  AppShell,
  Switch,
  IconSun,
  IconMoon,
  IconMenu,
  IconClose,
} from "@ochairo/beat-ui";
import type { BeatUiThemeController } from "@ochairo/beat-ui";

import styles from "./Layout.module.css";

interface LayoutProps {
  readonly router: BeatRouter;
  readonly theme: BeatUiThemeController;
  readonly children?: BeatJsxChild;
}

const NAV_ITEMS = [
  { path: "/", label: "Home" },
  { path: "/components", label: "Components" },
];

export const Layout = component<LayoutProps>((props): BeatJsxChild => {
  const handleThemeToggle = (checked: boolean): void => {
    props.theme.setMode(checked ? "dark" : "light");
  };

  return (
    <AppShell
      sidebarMode="toggle"
      brand={
        <Link router={props.router} to="/" class={styles["brand"]}>
          Beat UI
        </Link>
      }
      menuIcon={<IconMenu size={18} />}
      menuCloseIcon={<IconClose size={18} />}
      headerRight={
        <Switch
          defaultChecked={props.theme.mode.get() === "dark"}
          onCheckedChange={handleThemeToggle}
          checkedIcon={<IconMoon size={14} />}
          uncheckedIcon={<IconSun size={14} />}
          ariaLabel="Toggle dark mode"
        />
      }
      sidebar={NAV_ITEMS.map((item) => (
        <Link
          router={props.router}
          to={item.path}
          class={derived(props.router.current, (route) =>
            route.path === item.path
              ? `${styles["navLink"]} ${styles["navLinkActive"]}`
              : styles["navLink"],
          )}
        >
          {item.label}
        </Link>
      ))}
    >
      {props.children}
    </AppShell>
  );
});
