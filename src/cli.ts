import { basename, resolve } from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";

import { scaffoldBeatApp } from "./scaffold";

interface ParsedArguments {
  readonly force: boolean;
  readonly target: string | undefined;
  readonly ui: boolean;
}

export async function main(
  argv: string[] = process.argv.slice(2),
  baseDir: string,
): Promise<void> {
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

  const result = await scaffoldBeatApp(
    {
      force: parsed.force,
      packageName,
      targetDirectory: resolvedTarget,
      ui: parsed.ui,
    },
    baseDir,
  );

  printNextSteps(result.targetDirectory, requestedTarget, result.ui);
}

function parseCliArguments(argv: string[]): ParsedArguments {
  let force = false;
  let ui = false;
  const positionalArguments: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]!;

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

  return {
    force,
    target: positionalArguments[0],
    ui,
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
    "Usage: pnpm dlx @ochairo/beat-create [project-name] [--ui] [--force]",
  );
}

function printNextSteps(
  targetDirectory: string,
  requestedTarget: string,
  ui: boolean,
): void {
  const relativeTarget =
    requestedTarget === "." ? "." : basename(targetDirectory);

  console.log(`\nScaffolded Beat app in ${targetDirectory}`);

  if (ui) {
    console.log("Template: Beat UI");
  }

  console.log("\nNext steps:");

  if (relativeTarget !== ".") {
    console.log(`  cd ${relativeTarget}`);
  }

  console.log("  pnpm install");
  console.log("  pnpm dev");
}
