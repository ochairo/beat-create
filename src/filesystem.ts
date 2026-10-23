import { randomUUID } from "node:crypto";
import type { Stats } from "node:fs";
import { lstat, mkdir, open, realpath, rename, unlink } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";

async function inspect(path: string) {
  try {
    return await lstat(path);
  } catch (error: unknown) {
    if (hasCode(error, "ENOENT")) return undefined;
    throw error;
  }
}

function hasCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

/** Resolve explicitly selected ancestors, but never follow a linked target root. */
export async function canonicalTargetDirectory(requested: string): Promise<string> {
  if (requested === "") throw new Error("Project directory cannot be empty.");
  const target = resolve(requested);
  let current = target;
  const missing: string[] = [];
  while (true) {
    const entry = await inspect(current);
    if (entry) {
      if (current === target && entry.isSymbolicLink()) {
        throw new Error(`Target directory is a symbolic link: ${target}`);
      }
      const canonical = await realpath(current);
      if (!(await lstat(canonical)).isDirectory()) {
        throw new Error(`Expected a directory: ${current}`);
      }
      return resolve(canonical, ...missing);
    }
    missing.unshift(basename(current));
    const parent = dirname(current);
    if (parent === current) throw new Error(`Cannot resolve target: ${target}`);
    current = parent;
  }
}

function outputPath(target: string, name: string): string {
  const path = resolve(target, name);
  const within = relative(target, path);
  if (
    isAbsolute(name) || name.includes("\\") || within === "" ||
    within === ".." || within.startsWith(`..${sep}`) || isAbsolute(within)
  ) {
    throw new Error(`Template path escapes the target: ${name}`);
  }
  return path;
}

async function checkDirectory(path: string, create: boolean): Promise<void> {
  const parent = dirname(path);
  if (parent !== path) await checkDirectory(parent, create);
  let entry = await inspect(path);
  if (!entry && create) {
    try {
      await mkdir(path);
    } catch (error: unknown) {
      if (!hasCode(error, "EEXIST")) throw error;
    }
    entry = await inspect(path);
  }
  if (entry && (!entry.isDirectory() || entry.isSymbolicLink())) {
    throw new Error(`Destination ancestor is not an ordinary directory: ${path}`);
  }
}

async function checkDestination(path: string, force: boolean): Promise<void> {
  const entry = await inspect(path);
  if (entry && (!entry.isFile() || entry.isSymbolicLink())) {
    throw new Error(`Destination is not an ordinary file: ${path}`);
  }
  if (entry && !force) throw new Error(`Destination already exists: ${path}`);
}

async function replaceFile(path: string, content: string): Promise<void> {
  const temporary = resolve(dirname(path), `.beat-create-${randomUUID()}.tmp`);
  const handle = await open(temporary, "wx");
  let identity: Stats | undefined;
  try {
    try {
      identity = await handle.stat();
      await handle.writeFile(content, "utf8");
    } finally {
      await handle.close();
    }
    await checkDirectory(dirname(path), false);
    await checkDestination(path, true);
    // Replacing the directory entry does not truncate an existing hardlink's inode.
    await rename(temporary, path);
  } finally {
    const remaining = await inspect(temporary);
    if (identity && remaining?.dev === identity.dev && remaining.ino === identity.ino) {
      await unlink(temporary);
    }
  }
}

/** Per-file publication: failures stop later writes, without deleting prior output. */
export async function writeScaffoldFiles(
  target: string,
  files: Readonly<Record<string, string>>,
  force: boolean,
): Promise<void> {
  const writes = Object.entries(files).map(([name, content]) => ({
    path: outputPath(target, name), content,
  }));
  for (const { path } of writes) {
    await checkDirectory(dirname(path), false);
    await checkDestination(path, force);
  }

  let completed = 0;
  try {
    for (const { path, content } of writes) {
      await checkDirectory(dirname(path), true);
      await checkDestination(path, force);
      if (force) {
        await replaceFile(path, content);
      } else {
        const handle = await open(path, "wx");
        try {
          await handle.writeFile(content, "utf8");
        } finally {
          await handle.close();
        }
      }
      completed++;
    }
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : "Unknown write failure";
    throw new Error(
      `Scaffolding stopped after ${completed} completed file writes; partial output may remain. ${reason}`,
      { cause: error },
    );
  }
}
