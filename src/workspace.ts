import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import type { WorkspacePackages } from "./types";

const BEAT_PACKAGE_NAME = "@ochairo/beat";
const PULSE_PACKAGE_NAME = "@ochairo/pulse";
const BEAT_UI_PACKAGE_NAME = "@ochairo/beat-ui";

export function findLocalWorkspacePackages(
  monorepoRoot: string,
  targetDirectory: string,
): WorkspacePackages | null {
  return (
    findInstalledWorkspacePackages(monorepoRoot, targetDirectory) ??
    findPackagesFromTargetAncestors(targetDirectory)
  );
}

function findInstalledWorkspacePackages(
  monorepoRoot: string,
  targetDirectory: string,
): WorkspacePackages | null {
  const beatDirectory = resolve(monorepoRoot, "beat");
  const pulseDirectory = resolve(monorepoRoot, "pulse");

  if (
    !isExpectedPackageDirectory(beatDirectory, BEAT_PACKAGE_NAME) ||
    !isExpectedPackageDirectory(pulseDirectory, PULSE_PACKAGE_NAME)
  ) {
    return null;
  }

  const relativeToRoot = relative(monorepoRoot, targetDirectory);

  if (relativeToRoot === "" || relativeToRoot.startsWith("..")) {
    return null;
  }

  const beatUiDirectory = resolve(monorepoRoot, "beat-ui");

  return {
    beatDirectory,
    pulseDirectory,
    beatUiDirectory: isExpectedPackageDirectory(
      beatUiDirectory,
      BEAT_UI_PACKAGE_NAME,
    )
      ? beatUiDirectory
      : null,
  };
}

function findPackagesFromTargetAncestors(
  targetDirectory: string,
): WorkspacePackages | null {
  let currentDirectory = resolve(targetDirectory, "..");

  while (true) {
    const beatDirectory = resolve(currentDirectory, "beat");
    const pulseDirectory = resolve(currentDirectory, "pulse");

    if (
      isExpectedPackageDirectory(beatDirectory, BEAT_PACKAGE_NAME) &&
      isExpectedPackageDirectory(pulseDirectory, PULSE_PACKAGE_NAME)
    ) {
      const beatUiDir = resolve(currentDirectory, "beat-ui");

      return {
        beatDirectory,
        pulseDirectory,
        beatUiDirectory: isExpectedPackageDirectory(
          beatUiDir,
          BEAT_UI_PACKAGE_NAME,
        )
          ? beatUiDir
          : null,
      };
    }

    const parentDirectory = resolve(currentDirectory, "..");

    if (parentDirectory === currentDirectory) {
      return null;
    }

    currentDirectory = parentDirectory;
  }
}

function isExpectedPackageDirectory(
  directoryPath: string,
  expectedPackageName: string,
): boolean {
  const packageJsonPath = resolve(directoryPath, "package.json");

  if (!existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    return packageJson.name === expectedPackageName;
  } catch {
    return false;
  }
}
