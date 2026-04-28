# {{name}}

Showcases app scaffolded with `create-beat --template showcases`.

## Includes

- Vite configured with `createBeatVitePlugin()`
- TypeScript configured for Beat's JSX runtime
- `@ochairo/beat-ui` component library
- Feature-centric Clean Architecture (`domain/`, `data/`, `presentation/`)
- Crypto market overview with simulated live price feed
- Crypto detail page with interactive SVG price chart
- Kanban board with drag-and-drop and Gantt chart
- Spreadsheet with inline cell editing
- Sidebar navigation with dark / light theme toggle

## Commands

```sh
pnpm install
pnpm dev
pnpm build
pnpm preview
pnpm typecheck
```

## Project Structure

```
src/
  main.tsx                       – app mount entry
  App.tsx                        – composition root, router, theme
  shared/
    market/market-symbols.ts     – symbol registry
    data/fake-market-client.ts   – simulated WebSocket feed
    layout/                      – AppLayout, Header, SideNav
  features/
    crypto/                      – market overview page
    crypto-detail/               – coin price chart page
    kanban/                      – project board & Gantt chart
    spreadsheet/                 – editable grid
```
