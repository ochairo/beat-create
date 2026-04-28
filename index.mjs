#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createInterface } from "node:readline/promises";

const DEFAULT_TEMPLATE = "starter";
const TEMPLATE_NAMES = [DEFAULT_TEMPLATE, "showcases"];
const BEAT_PACKAGE_NAME = "@ochairo/beat";
const PULSE_PACKAGE_NAME = "@ochairo/pulse";
const BEAT_UI_PACKAGE_NAME = "@ochairo/beat-ui";
const CREATE_BEAT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const BEAT_PACKAGE_DIRECTORY = resolve(CREATE_BEAT_DIRECTORY, "../beat");
const MONOREPO_ROOT_DIRECTORY = resolve(CREATE_BEAT_DIRECTORY, "..");
const PULSE_PACKAGE_DIRECTORY = resolve(CREATE_BEAT_DIRECTORY, "../pulse");
const BEAT_UI_PACKAGE_DIRECTORY = resolve(CREATE_BEAT_DIRECTORY, "../beat-ui");

export async function scaffoldBeatApp(options) {
  const targetDirectory = resolve(options.targetDirectory);
  const packageName = sanitizePackageName(options.packageName);
  const template = sanitizeTemplateName(options.template);
  const existingEntries = await readDirectoryEntries(targetDirectory);

  if (existingEntries.length > 0 && !options.force) {
    throw new Error(
      `Target directory is not empty: ${targetDirectory}. Use an empty directory or pass --force.`,
    );
  }

  const templateDir = resolveTemplateDirectory(template);
  const files = collectTemplateFiles(
    templateDir,
    packageName,
    targetDirectory,
    template,
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

  return { packageName, targetDirectory, template };
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    return;
  }

  const parsed = parseCliArguments(argv);
  const promptedTarget = parsed.target ? "" : await promptForProjectName();
  const requestedTarget =
    parsed.target ?? (promptedTarget.trim() || "beat-app");
  const resolvedTarget = resolve(process.cwd(), requestedTarget);
  const packageName = basename(resolvedTarget);

  const result = await scaffoldBeatApp({
    force: parsed.force,
    packageName,
    targetDirectory: resolvedTarget,
    template: parsed.template,
  });

  printNextSteps(result.targetDirectory, requestedTarget, result.template);
}

function parseCliArguments(argv) {
  let force = false;
  let template = DEFAULT_TEMPLATE;
  const positionalArguments = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--force") {
      force = true;
      continue;
    }

    if (argument === "--template" || argument === "-t") {
      const templateValue = argv[index + 1];

      if (!templateValue || templateValue.startsWith("-")) {
        throw new Error(
          "Missing value for --template. Use starter or showcases.",
        );
      }

      template = templateValue;
      index += 1;
      continue;
    }

    if (argument.startsWith("--template=")) {
      template = argument.slice("--template=".length);
      continue;
    }

    if (argument.startsWith("-")) {
      throw new Error(`Unknown argument: ${argument}`);
    }

    positionalArguments.push(argument);
  }

  return {
    force,
    target: positionalArguments[0],
    template: sanitizeTemplateName(template),
  };
}

async function promptForProjectName() {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    return await readline.question("Project name: ");
  } finally {
    readline.close();
  }
}

function printUsage() {
  console.log(
    "Usage: pnpm dlx @ochairo/beat-create [project-name] [--template starter|showcases] [--force]",
  );
}

function printNextSteps(targetDirectory, requestedTarget, template) {
  const relativeTarget =
    requestedTarget === "." ? "." : basename(targetDirectory);

  console.log(`\nScaffolded Beat app in ${targetDirectory}`);
  console.log(`Template: ${template}`);
  console.log("\nNext steps:");

  if (relativeTarget !== ".") {
    console.log(`  cd ${relativeTarget}`);
  }

  console.log("  pnpm install");
  console.log("  pnpm dev");
}

async function readDirectoryEntries(targetDirectory) {
  try {
    return await readdir(targetDirectory);
  } catch (error) {
    if (isMissingDirectoryError(error)) {
      return [];
    }

    throw error;
  }
}

function isMissingDirectoryError(error) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

function sanitizePackageName(value) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "beat-app"
  );
}

function sanitizeTemplateName(value = DEFAULT_TEMPLATE) {
  const normalizedValue = value.trim().toLowerCase() || DEFAULT_TEMPLATE;

  if (!TEMPLATE_NAMES.includes(normalizedValue)) {
    throw new Error(
      `Unsupported template: ${value}. Use one of ${TEMPLATE_NAMES.join(", ")}.`,
    );
  }

  return normalizedValue;
}

function resolveTemplateDirectory(template) {
  const dirName = template === DEFAULT_TEMPLATE ? "default" : template;
  return resolve(CREATE_BEAT_DIRECTORY, "templates", dirName);
}

function collectTemplateFiles(
  templateDir,
  packageName,
  targetDirectory,
  template,
) {
  const localPackages = findLocalWorkspacePackages(targetDirectory);
  const files = {};

  function collect(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = resolve(dir, entry.name);

      if (entry.isDirectory()) {
        collect(fullPath);
        continue;
      }

      const rel = relative(templateDir, fullPath).split("\\").join("/");
      let content = readFileSync(fullPath, "utf8").replaceAll(
        "{{name}}",
        packageName,
      );

      if (rel === "package.json" && localPackages) {
        content = injectWorkspaceDependencies(
          content,
          targetDirectory,
          localPackages,
          template,
        );
      }

      files[rel] = content;
    }
  }

  collect(templateDir);
  return files;
}

function injectWorkspaceDependencies(
  packageJsonContent,
  targetDirectory,
  localPackages,
  template,
) {
  const pkg = JSON.parse(packageJsonContent);

  pkg.dependencies[BEAT_PACKAGE_NAME] =
    `file:${toPortableRelativePath(targetDirectory, localPackages.beatDirectory)}`;
  pkg.dependencies[PULSE_PACKAGE_NAME] =
    `file:${toPortableRelativePath(targetDirectory, localPackages.pulseDirectory)}`;

  if (template === "showcases" && localPackages.beatUiDirectory) {
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

function findLocalWorkspacePackages(targetDirectory) {
  return (
    findInstalledWorkspacePackages(targetDirectory) ??
    findPackagesFromTargetAncestors(targetDirectory)
  );
}

function findInstalledWorkspacePackages(targetDirectory) {
  if (
    !isExpectedPackageDirectory(BEAT_PACKAGE_DIRECTORY, BEAT_PACKAGE_NAME) ||
    !isExpectedPackageDirectory(PULSE_PACKAGE_DIRECTORY, PULSE_PACKAGE_NAME)
  ) {
    return null;
  }

  const relativeToRoot = relative(MONOREPO_ROOT_DIRECTORY, targetDirectory);

  if (relativeToRoot === "" || relativeToRoot.startsWith("..")) {
    return null;
  }

  const beatUiDirectory = isExpectedPackageDirectory(
    BEAT_UI_PACKAGE_DIRECTORY,
    BEAT_UI_PACKAGE_NAME,
  )
    ? BEAT_UI_PACKAGE_DIRECTORY
    : null;

  return {
    beatDirectory: BEAT_PACKAGE_DIRECTORY,
    pulseDirectory: PULSE_PACKAGE_DIRECTORY,
    beatUiDirectory,
  };
}

function findPackagesFromTargetAncestors(targetDirectory) {
  let currentDirectory = resolve(targetDirectory, "..");

  while (true) {
    const beatDirectory = resolve(currentDirectory, "beat");
    const pulseDirectory = resolve(currentDirectory, "pulse");

    if (
      isExpectedPackageDirectory(beatDirectory, BEAT_PACKAGE_NAME) &&
      isExpectedPackageDirectory(pulseDirectory, PULSE_PACKAGE_NAME)
    ) {
      const beatUiDir = resolve(currentDirectory, "beat-ui");
      const beatUiDirectory = isExpectedPackageDirectory(
        beatUiDir,
        BEAT_UI_PACKAGE_NAME,
      )
        ? beatUiDir
        : null;

      return { beatDirectory, pulseDirectory, beatUiDirectory };
    }

    const parentDirectory = resolve(currentDirectory, "..");

    if (parentDirectory === currentDirectory) {
      return null;
    }

    currentDirectory = parentDirectory;
  }
}

function isExpectedPackageDirectory(directoryPath, expectedPackageName) {
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

function toPortableRelativePath(fromDirectory, toDirectory) {
  return relative(fromDirectory, toDirectory).split("\\").join("/");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const message =
      error instanceof Error ? error.message : "Unknown create-beat failure";
    console.error(message);
    process.exitCode = 1;
  });
}
