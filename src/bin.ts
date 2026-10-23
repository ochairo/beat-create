#!/usr/bin/env node

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

import { main } from "./index.js";
import { displayText } from "./display.js";

const baseDir = dirname(dirname(fileURLToPath(import.meta.url)));

main(process.argv.slice(2), baseDir).catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown create-beat failure";
  console.error(displayText(message));
  process.exitCode = 1;
});
