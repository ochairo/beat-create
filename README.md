<!-- markdownlint-disable MD033 MD041 -->

<div align="center">

<h1>beat create</h1>

Scaffold a [Beat](https://github.com/ochairo/beat) app with Vite, TypeScript, and [Pulse](https://github.com/ochairo/pulse).

[![npm version](https://img.shields.io/npm/v/@ochairo/beat-create)](https://www.npmjs.com/package/@ochairo/beat-create)
[![npm downloads](https://img.shields.io/npm/dm/@ochairo/beat-create)](https://www.npmjs.com/package/@ochairo/beat-create)
![License](https://img.shields.io/badge/license-MIT-blue)

[Documentation](https://ochairo.github.io/beat-site/)

</div>

Usage:

```sh
npx @ochairo/beat-create my-app
npx @ochairo/beat-create my-app --ui
```

The default template scaffolds a minimal hello-world app. Use `--ui` for a multi-page app with Beat UI components, a side menu, theme switching, and a component showcase.

The CLI creates the project and installs its dependencies with npm. After it succeeds,
enter the printed directory and run `npm run dev`. npm 11 or later is required for
automatic installation, even when launching the CLI through `pnpm dlx`.

Use `--skip-install` for offline scaffolding or to install dependencies yourself.
`--force` requires `--skip-install`: automatic installation accepts only new or empty
project directories. Installation disables lifecycle scripts and includes development
and platform dependencies. It uses local project mode even when your npm environment
requests global or production-only installation. The selected Node/npm toolchain,
user npm configuration, and package cache remain trusted; this is not a sandbox.
Standard npm JavaScript-entry layouts are supported; unsupported toolchain layouts
fail before generating files and can use `--skip-install`.

If installation fails or is interrupted, generated files and partial dependencies
are kept. The CLI reports failure and prints a retry command with the same installation
flags. It reports successful installation only after npm finishes successfully.
The programmatic `scaffoldBeatApp` API only creates files and never installs packages.

## Upgrading to 2.0.0

Use Node 24.22.1 or later within 24.x, or Node 26.12.1 or later. Both templates
use Beat and Pulse 2.0.0, TypeScript 5.9.3, and Vite 7.3.7 or compatible updates.
The UI template also requires Beat UI 2.0.0. Generated apps declare the same Node
requirement as their libraries.

Generated apps use published npm dependencies by default. For local development,
explicitly select a workspace you trust:

```sh
npx @ochairo/beat-create my-app --workspace /absolute/path/to/workspace
```

The workspace must contain ordinary `beat` and `pulse` directories with matching
package names; `--ui` additionally requires `beat-ui`. Build those packages first:
installation does not run their build or lifecycle scripts. Workspace installation
uses npm 11 or later with `file:` dependencies, `install-links=true`, and npm
overrides so the app, Beat, and Beat UI share the selected Beat and Pulse packages.
npm installs package copies and their dependencies into the app; the workspace does
not need its own installed dependencies. Generated `.npmrc` preserves this layout
for later npm installs and `npm ci` (use `--ignore-scripts` to keep scripts disabled).

Installed packages are snapshots. After rebuilding a workspace package, remove its
copy under the app's `node_modules/@ochairo/` and run the printed install command
again to refresh it. Workspace code can execute when the generated app is run.
Package names identify the expected packages; they do not establish trust or version compatibility. Ancestor
directories are never searched automatically. The programmatic API accepts the
same explicit path as `ScaffoldOptions.workspaceRoot`.

Both the CLI and API reject empty destination strings. Use `.` explicitly when
the current directory is the intended destination.

Without `--force`, the target must be empty and existing files are never overwritten.
With `--force`, template files are replaced individually and unrelated entries are
preserved. Linked destinations, linked template entries, and special files are
rejected. Forced replacement does not modify other hardlinks to an old file, but
may change the replaced file's metadata.

Scaffolding is not a transaction. On failure, subsequent writes stop, but completed
files, new directories, or an incomplete newly created file may remain. No rollback
deletes existing project data. Run in a trusted directory hierarchy on a local
filesystem: portable Node pathname operations cannot prevent a hostile process
from concurrently replacing parent directories. Printed `cd` commands use POSIX
shell quoting; Windows and control-character paths require opening the displayed
directory manually.
