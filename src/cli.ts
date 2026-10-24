import { basename, resolve } from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";

import { scaffoldBeatApp } from "./scaffold.js";
import { displayText, hasControlCharacters, quotePosixPath } from "./display.js";
import { canonicalTargetDirectory } from "./filesystem.js";
import { INSTALL_COMMAND, installDependencies, resolveNpmCli } from "./install.js";

/** Validated CLI choices before prompting or writing any project files. */
interface ParsedArguments {
  readonly force: boolean;
  readonly help: boolean;
  readonly skipInstall: boolean;
  readonly target: string | undefined;
  readonly ui: boolean;
  readonly workspaceRoot: string | undefined;
}

export async function main(
  argv: string[] = process.argv.slice(2),
  baseDir: string,
): Promise<void> {
  const parsed = parseCliArguments(argv);
  if (parsed.help) {
    printUsage();
    return;
  }

  const promptedTarget = parsed.target ? "" : await promptForProjectName();
  const requestedTarget =
    parsed.target ?? (promptedTarget.trim() || "beat-app");
  const resolvedTarget = resolve(process.cwd(), requestedTarget);
  const packageName = basename(resolvedTarget);
  const canonicalTarget = await canonicalTargetDirectory(resolvedTarget);
  const npmCli = parsed.skipInstall ? undefined : await resolveNpmCli(canonicalTarget);

  const result = await scaffoldBeatApp(
    {
      force: parsed.force,
      packageName,
      targetDirectory: canonicalTarget,
      ui: parsed.ui,
      ...(parsed.workspaceRoot === undefined ? {} : { workspaceRoot: parsed.workspaceRoot }),
    },
    baseDir,
  );

  if (npmCli !== undefined) {
    console.log("\nInstalling dependencies with npm (lifecycle scripts disabled)...");
    try {
      await installDependencies(result.targetDirectory, npmCli);
    } catch (error: unknown) {
      console.error(`\nDependency installation failed in ${displayText(result.targetDirectory)}. Generated files and partial installation were kept.`);
      printDirectoryCommand(result.targetDirectory);
      console.error(`  ${INSTALL_COMMAND}`);
      throw error;
    }
  }
  printNextSteps(result.targetDirectory, result.ui, parsed.skipInstall);
}

function parseCliArguments(argv: string[]): ParsedArguments {
  let force = false;
  let help = false;
  let skipInstall = false;
  let ui = false;
  let workspaceRoot: string | undefined;
  const positionalArguments: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]!;

    if (argument === "--") {
      positionalArguments.push(...argv.slice(index + 1));
      break;
    }

    if (argument === "--workspace") {
      const selected = argv[++index];
      if (!selected || selected.startsWith("-") || workspaceRoot !== undefined) {
        throw new Error("--workspace requires one explicit directory path.");
      }
      workspaceRoot = resolve(selected);
      continue;
    }

    if (argument === "--help" || argument === "-h") {
      help = true;
      continue;
    }

    if (argument === "--skip-install") {
      skipInstall = true;
      continue;
    }

    if (argument === "--force") {
      force = true;
      continue;
    }

    if (argument === "--ui") {
      ui = true;
      continue;
    }

    if (argument.startsWith("-")) {
      throw new Error(`Unknown argument: ${argument}`);
    }

    positionalArguments.push(argument);
  }

  if (positionalArguments.length > 1) throw new Error("Expected one project directory.");
  if (positionalArguments[0] === "") throw new Error("Project directory cannot be empty.");
  if (force && !skipInstall && !help) {
    throw new Error("--force requires --skip-install. Review the existing project's configuration before installing dependencies manually.");
  }

  return {
    force,
    help,
    skipInstall,
    target: positionalArguments[0],
    ui,
    workspaceRoot,
  };
}

async function promptForProjectName(): Promise<string> {
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

function printUsage(): void {
  console.log(
    "Usage: npx @ochairo/beat-create [project-directory] [--ui] [--skip-install] [--force] [--workspace PATH]",
  );
}

function printNextSteps(
  targetDirectory: string,
  ui: boolean,
  skipInstall: boolean,
): void {
  console.log(`\n${skipInstall ? "Created Beat app files" : "Created Beat app and installed dependencies"} in ${displayText(targetDirectory)}`);

  if (ui) {
    console.log("Template: Beat UI");
  }

  printDirectoryCommand(targetDirectory);
  if (skipInstall) console.log(`  ${INSTALL_COMMAND}`);
  console.log("  npm run dev");
}

function printDirectoryCommand(targetDirectory: string): void {
  if (process.platform === "win32" || hasControlCharacters(targetDirectory)) {
    console.log("\nOpen the project directory shown above in your terminal, then run:");
  } else {
    console.log("\nNext steps (POSIX shell):");
    console.log(`  cd ${quotePosixPath(targetDirectory)}`);
  }

}
