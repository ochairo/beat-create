import { spawn } from "node:child_process";
import { readFile, realpath, stat } from "node:fs/promises";
import { basename, delimiter, dirname, isAbsolute, relative, resolve, sep } from "node:path";

/** Fixed policy for a local install, regardless of inherited production/global settings. */
export const INSTALL_ARGUMENTS = [
  "install", "--ignore-scripts", "--global=false", "--workspaces=false",
  "--include=dev", "--include=optional", "--dry-run=false", "--package-lock-only=false",
  "--no-audit", "--no-fund", "--prefix=.",
] as const;

export const INSTALL_COMMAND = `npm ${INSTALL_ARGUMENTS.join(" ")}`;

function isWithin(directory: string, path: string): boolean {
  const distance = relative(directory, path);
  return distance === "" || (!isAbsolute(distance) && distance !== ".." && !distance.startsWith(`..${sep}`));
}

/** Resolve only standard npm JavaScript entries; the caller's Node/toolchain remains trusted. */
export async function resolveNpmCli(targetDirectory: string): Promise<string> {
  const currentDirectory = await realpath(process.cwd());
  const nodeDirectory = dirname(await realpath(process.execPath));
  const candidates = [
    { path: process.env["npm_execpath"], nodeAdjacent: false },
    { path: resolve(nodeDirectory, "node_modules/npm/bin/npm-cli.js"), nodeAdjacent: true },
    { path: resolve(nodeDirectory, "../lib/node_modules/npm/bin/npm-cli.js"), nodeAdjacent: true },
  ];
  for (const directory of (process.env["PATH"] ?? "").split(delimiter)) {
    if (!isAbsolute(directory)) continue;
    candidates.push(
      { path: resolve(directory, "npm"), nodeAdjacent: false },
      { path: resolve(directory, "node_modules/npm/bin/npm-cli.js"), nodeAdjacent: false },
    );
  }

  for (const { path: candidate, nodeAdjacent } of candidates) {
    if (!candidate || !isAbsolute(candidate)) continue;
    try {
      const entry = await realpath(candidate);
      if (
        basename(entry) !== "npm-cli.js" || (!nodeAdjacent && isWithin(currentDirectory, entry)) ||
        isWithin(targetDirectory, entry) || !(await stat(entry)).isFile()
      ) continue;
      const manifest: unknown = JSON.parse(await readFile(resolve(dirname(entry), "../package.json"), "utf8"));
      if (
        typeof manifest !== "object" || manifest === null ||
        !("name" in manifest) || manifest.name !== "npm" ||
        !("version" in manifest) || typeof manifest.version !== "string"
      ) continue;
      const major = /^(\d+)\./.exec(manifest.version)?.[1];
      if (major !== undefined && Number(major) >= 11) return entry;
    } catch {
      // Another bounded standard location may contain the caller's npm installation.
    }
  }
  throw new Error("npm 11 or later was not found in a supported toolchain location outside the project. Use --skip-install to generate files only.");
}

/** Own one non-detached installer and wait for termination before reporting its outcome. */
export function installDependencies(targetDirectory: string, npmCli: string): Promise<void> {
  return new Promise((fulfilled, rejected) => {
    const child = spawn(process.execPath, [npmCli, ...INSTALL_ARGUMENTS], {
      cwd: targetDirectory,
      shell: false,
      stdio: "inherit",
    });
    let cancelled: NodeJS.Signals | undefined;
    let processError: Error | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    function cancel(signal: NodeJS.Signals): void {
      if (cancelled) return;
      cancelled = signal;
      child.kill(signal);
      timeout = setTimeout(() => child.kill("SIGKILL"), 5000);
      timeout.unref();
    }
    const interrupt = () => cancel("SIGINT");
    const terminate = () => cancel("SIGTERM");
    process.on("SIGINT", interrupt);
    process.on("SIGTERM", terminate);
    child.once("error", error => { processError = error; });
    child.once("close", (code, signal) => {
      process.removeListener("SIGINT", interrupt);
      process.removeListener("SIGTERM", terminate);
      if (timeout) clearTimeout(timeout);
      if (processError) rejected(processError);
      else if (cancelled || signal) rejected(new Error(`Dependency installation stopped by ${cancelled ?? signal}.`));
      else if (code !== 0) rejected(new Error(`npm install exited with code ${code}.`));
      else fulfilled();
    });
  });
}
