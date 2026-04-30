import { mkdir, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { ScaffoldOptions, ScaffoldResult } from "./types";
import { collectTemplateFiles, resolveTemplateDirectory } from "./template";

export function sanitizePackageName(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "beat-app"
  );
}

export async function scaffoldBeatApp(
  options: ScaffoldOptions,
  baseDir: string,
): Promise<ScaffoldResult> {
  const targetDirectory = resolve(options.targetDirectory);
  const packageName = sanitizePackageName(options.packageName);
  const ui = options.ui ?? false;
  const existingEntries = await readDirectoryEntries(targetDirectory);

  if (existingEntries.length > 0 && !options.force) {
    throw new Error(
      `Target directory is not empty: ${targetDirectory}. Use an empty directory or pass --force.`,
    );
  }

  const templatesRoot = resolve(baseDir, "templates");
  const templateDir = resolveTemplateDirectory(ui, templatesRoot);
  const monorepoRoot = resolve(baseDir, "..");
  const files = collectTemplateFiles(
    templateDir,
    packageName,
    targetDirectory,
    monorepoRoot,
    ui,
  );

  await Promise.all(
    Object.entries(files).map(async ([relativePath, content]) => {
      const outputPath = resolve(targetDirectory, relativePath);
      const parentPath = relativePath.includes("/")
        ? resolve(
            targetDirectory,
            relativePath.slice(0, relativePath.lastIndexOf("/")),
          )
        : targetDirectory;

      await mkdir(parentPath, { recursive: true });
      await writeFile(outputPath, content, "utf8");
    }),
  );

  return { packageName, targetDirectory, ui };
}

async function readDirectoryEntries(
  targetDirectory: string,
): Promise<string[]> {
  try {
    return await readdir(targetDirectory);
  } catch (error: unknown) {
    if (isMissingDirectoryError(error)) {
      return [];
    }

    throw error;
  }
}

function isMissingDirectoryError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "ENOENT"
  );
}
