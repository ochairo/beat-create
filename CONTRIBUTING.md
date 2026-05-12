# Contributing

Thanks for your interest in contributing.

## Prerequisites

- Node.js `>=20`
- pnpm `>=10`

## Setup

1. Fork the repository.
2. Clone your fork.
3. Install dependencies from the package root:

```sh
pnpm install
```

If you are working from the monorepo, run commands from this package directory.

## Development Workflow

Use the scripts defined in this repository's `package.json`. Common commands are:

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm validate
```

If `pnpm validate` is available, run it before opening a pull request. Otherwise run the relevant test, typecheck, and build commands manually.

## Pull Request Guidelines

1. Start by opening or confirming the issue you are working on.
2. Branch from `develop` using the format `feature/<issueNo>`.
3. Open pull requests against `develop`. Contributor changes should not target `main` directly.
4. Keep the change focused.
5. Add or update tests when behavior changes.
6. Update docs or examples when public APIs or workflows change.
7. Prefer root-cause fixes over workarounds.

## Release Flow

Regular development happens on `develop`.
Contributors should create an issue first, then branch from `develop` as `feature/<issueNo>` and open the pull request back into `develop`.
To publish a release, maintainers merge `develop` into `main` and create the release tag from `main`.

## Code Style

- TypeScript in strict mode
- Avoid `any`; use `unknown` when the type is genuinely unknown
- Add explicit return types for public APIs
- Follow the existing naming, file, and test conventions in the repository

## Reporting Issues

Use GitHub Issues for reproducible bugs and actionable feature requests.
For security reports, follow `SECURITY.md`.
