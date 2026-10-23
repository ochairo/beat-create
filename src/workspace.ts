import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import type { WorkspacePackages } from "./types.js";

/** The caller explicitly selects this root; package names validate shape, not trust. */
export function resolveWorkspacePackages(root: string, ui: boolean): WorkspacePackages {
  if (root === "") throw new Error("Workspace directory cannot be empty.");
  const requested = resolve(root);
  if (!lstatSync(requested).isDirectory()) throw new Error(`Workspace is not an ordinary directory: ${requested}`);
  const canonical = realpathSync(requested);

  function packageDirectory(name: string): string {
    const directory = resolve(canonical, name);
    const manifest = resolve(directory, "package.json");
    if (!lstatSync(directory).isDirectory() || !lstatSync(manifest).isFile()) {
      throw new Error(`Workspace package must use ordinary directories and files: ${name}`);
    }
    const parsed: unknown = JSON.parse(readFileSync(manifest, "utf8"));
    if (typeof parsed !== "object" || parsed === null || !("name" in parsed) || parsed.name !== `@ochairo/${name}`) {
      throw new Error(`Expected workspace package @ochairo/${name}: ${directory}`);
    }
    return directory;
  }

  return {
    beatDirectory: packageDirectory("beat"),
    pulseDirectory: packageDirectory("pulse"),
    beatUiDirectory: ui ? packageDirectory("beat-ui") : null,
  };
}
