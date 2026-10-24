# {{name}}

A [Beat](https://github.com/ochairo/beat) + [Beat UI](https://github.com/ochairo/beat-ui) app scaffolded with `@ochairo/beat-create`.

## Getting Started

The scaffolder normally installs dependencies automatically. If you used
`--skip-install` or installation failed, run the same installation command with
npm 11 or later:

```sh
npm install --ignore-scripts --global=false --workspaces=false --install-links=true \
  --include=dev --include=optional --dry-run=false --package-lock-only=false \
  --no-audit --no-fund --prefix=.
```

This disables dependency lifecycle scripts and preserves the workspace package
installation policy. Workspace projects rely on the generated `.npmrc` and npm
`overrides` to share the selected Beat and Pulse packages.

After dependencies are installed, start the development server:

```sh
npm run dev
```
