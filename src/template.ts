import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";

import type { WorkspacePackages } from "./types";
import { findLocalWorkspacePackages } from "./workspace";

const BEAT_PACKAGE_NAME = "@ochairo/beat";
const PULSE_PACKAGE_NAME = "@ochairo/pulse";
const BEAT_UI_PACKAGE_NAME = "@ochairo/beat-ui";

export function collectTemplateFiles(
  templateDir: string,
  packageName: string,
  targetDirectory: string,
  monorepoRoot: string,
  ui: boolean,
): Record<string, string> {
  const localPackages = findLocalWorkspacePackages(
    monorepoRoot,
    targetDirectory,
  );
  const files: Record<string, string> = {};

  function collect(dir: string, root: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "pnpm-lock.yaml") {
        continue;
      }

      const fullPath = resolve(dir, entry.name);

      if (entry.isDirectory()) {
        collect(fullPath, root);
        continue;
      }

      const rel = relative(root, fullPath).split("\\").join("/");
      let content = readFileSync(fullPath, "utf8").replaceAll(
        "{{name}}",
        packageName,
      );

      if (rel === "package.json" && localPackages) {
        content = injectWorkspaceDependencies(
          content,
          targetDirectory,
          localPackages,
          ui,
        );
      }

      files[rel] = content;
    }
  }

  collect(templateDir, templateDir);
  return files;
}

export function resolveTemplateDirectory(
  ui: boolean,
  templatesRoot: string,
): string {
  return resolve(templatesRoot, ui ? "ui" : "default");
}

function injectWorkspaceDependencies(
  packageJsonContent: string,
  targetDirectory: string,
  localPackages: WorkspacePackages,
  ui: boolean,
): string {
  const pkg = JSON.parse(packageJsonContent);

  pkg.dependencies[BEAT_PACKAGE_NAME] =
    `file:${toPortableRelativePath(targetDirectory, localPackages.beatDirectory)}`;
  pkg.dependencies[PULSE_PACKAGE_NAME] =
    `file:${toPortableRelativePath(targetDirectory, localPackages.pulseDirectory)}`;

  if (ui && localPackages.beatUiDirectory) {
    pkg.dependencies[BEAT_UI_PACKAGE_NAME] =
      `file:${toPortableRelativePath(targetDirectory, localPackages.beatUiDirectory)}`;
  }

  pkg.pnpm = {
    overrides: {
      [PULSE_PACKAGE_NAME]: `file:${toPortableRelativePath(targetDirectory, localPackages.pulseDirectory)}`,
    },
  };

  return `${JSON.stringify(pkg, null, 2)}\n`;
}

function toPortableRelativePath(
  fromDirectory: string,
  toDirectory: string,
): string {
  return relative(fromDirectory, toDirectory).split("\\").join("/");
}
