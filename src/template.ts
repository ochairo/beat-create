import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";

import type { WorkspacePackages } from "./types.js";
import { resolveWorkspacePackages } from "./workspace.js";

const BEAT_PACKAGE_NAME = "@ochairo/beat";
const PULSE_PACKAGE_NAME = "@ochairo/pulse";
const BEAT_UI_PACKAGE_NAME = "@ochairo/beat-ui";

export function collectTemplateFiles(
  templateDir: string,
  packageName: string,
  targetDirectory: string,
  workspaceRoot: string | undefined,
  ui: boolean,
): Record<string, string> {
  const localPackages = workspaceRoot === undefined ? null : resolveWorkspacePackages(workspaceRoot, ui);
  const files = Object.create(null) as Record<string, string>;

  function collect(dir: string, root: string): void {
    if (!lstatSync(dir).isDirectory()) throw new Error(`Template directory is not an ordinary directory: ${dir}`);
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "pnpm-lock.yaml") {
        continue;
      }

      const fullPath = resolve(dir, entry.name);
      if (entry.name.includes("\\") || entry.isSymbolicLink()) {
        throw new Error(`Unsafe template entry: ${fullPath}`);
      }

      if (entry.isDirectory()) {
        collect(fullPath, root);
        continue;
      }

      if (!entry.isFile()) throw new Error(`Template entry is not an ordinary file: ${fullPath}`);
      const templatePath = relative(root, fullPath).split("\\").join("/");
      // npm excludes .gitignore from package tarballs; restore the template name.
      const rel = templatePath === "_gitignore" ? ".gitignore" : templatePath;
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

      if (rel in files) throw new Error(`Duplicate template destination: ${rel}`);
      files[rel] = content;
    }
  }

  collect(templateDir, templateDir);
  if (localPackages) {
    if (".npmrc" in files) throw new Error("Duplicate template destination: .npmrc");
    // Keep later npm install/ci consistent with the automatic packed installation.
    files[".npmrc"] = "install-links=true\n";
  }
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
  const pkg: unknown = JSON.parse(packageJsonContent);
  if (!isRecord(pkg) || !isRecord(pkg["dependencies"])) {
    throw new Error("Template package.json must contain a dependencies object.");
  }
  const dependencies = pkg["dependencies"];

  dependencies[BEAT_PACKAGE_NAME] =
    `file:${toPortableRelativePath(targetDirectory, localPackages.beatDirectory)}`;
  dependencies[PULSE_PACKAGE_NAME] =
    `file:${toPortableRelativePath(targetDirectory, localPackages.pulseDirectory)}`;

  if (ui && localPackages.beatUiDirectory) {
    dependencies[BEAT_UI_PACKAGE_NAME] =
      `file:${toPortableRelativePath(targetDirectory, localPackages.beatUiDirectory)}`;
  }

  // Every consumer uses the application's selected runtime packages, including UI.
  pkg["overrides"] = {
    [BEAT_PACKAGE_NAME]: `$${BEAT_PACKAGE_NAME}`,
    [PULSE_PACKAGE_NAME]: `$${PULSE_PACKAGE_NAME}`,
  };

  return `${JSON.stringify(pkg, null, 2)}\n`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toPortableRelativePath(
  fromDirectory: string,
  toDirectory: string,
): string {
  return relative(fromDirectory, toDirectory).split("\\").join("/");
}
