import { execFile } from "node:child_process";
import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli.js";
import { INSTALL_ARGUMENTS, resolveNpmCli } from "../src/install.js";

const execute = promisify(execFile);
const roots: string[] = [];
const forbiddenScript = 'node -e "require(\'node:fs\').writeFileSync(\'HOOK_RAN\', \'unexpected\')"';

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function packageFixture(directory: string, name: string, source: string, dependencies: Record<string, string> = {}): Promise<void> {
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "package.json"), JSON.stringify({
    name, version: "2.0.0", type: "module", main: "index.js", files: ["index.js"], dependencies,
    scripts: Object.fromEntries(["prepare", "prepack", "postpack", "preinstall", "install", "postinstall"].map(name => [name, forbiddenScript])),
  }));
  await writeFile(join(directory, "index.js"), source);
}

describe("workspace installation with real npm", () => {
  it.each([
    { ui: false, preinstalled: false }, { ui: true, preinstalled: false },
    { ui: false, preinstalled: true }, { ui: true, preinstalled: true },
  ])("installs an isolated app (ui=$ui, source dependencies=$preinstalled)", async ({ ui, preinstalled }) => {
    const root = await mkdtemp(join(tmpdir(), "beat-create-workspace-"));
    roots.push(root);
    const workspace = join(root, "workspace");
    const target = join(root, "app");
    const base = join(root, "scaffolder");
    const npm = await resolveNpmCli(target);
    const emptyConfig = join(root, "empty.npmrc");
    await writeFile(emptyConfig, "");
    // No external registry or user npm configuration participates in this regression.
    vi.stubEnv("npm_config_userconfig", emptyConfig);
    vi.stubEnv("npm_config_globalconfig", join(root, "absent-global.npmrc"));
    vi.stubEnv("npm_config_cache", join(root, "cache"));
    vi.stubEnv("npm_config_registry", "http://127.0.0.1:9");
    vi.stubEnv("npm_config_offline", "true");
    vi.stubEnv("npm_config_install_links", "false");
    vi.spyOn(console, "log").mockImplementation(() => {});

    const extra = join(root, "extra");
    await packageFixture(extra, "workspace-extra", 'export const value = "transitive dependency loaded";');
    await execute(process.execPath, [npm, "pack", "--ignore-scripts", "--pack-destination", root], { cwd: extra });
    const beat = join(workspace, "beat");
    const pulse = join(workspace, "pulse");
    const beatUi = join(workspace, "beat-ui");
    await packageFixture(pulse, "@ochairo/pulse", "export const token = {};");
    await packageFixture(beat, "@ochairo/beat", 'export { token } from "@ochairo/pulse"; export { value } from "workspace-extra";', {
      "@ochairo/pulse": "^1.0.0", "workspace-extra": `file:${join(root, "workspace-extra-2.0.0.tgz")}`,
    });
    if (ui) await packageFixture(beatUi, "@ochairo/beat-ui", 'export { token as direct } from "@ochairo/pulse"; export { token as viaBeat } from "@ochairo/beat";', {
      "@ochairo/beat": "^1.0.0", "@ochairo/pulse": "^1.0.0",
    });
    const sources = ui ? [beat, pulse, beatUi] : [beat, pulse];
    if (preinstalled) {
      for (const directory of sources) {
        await packageFixture(join(directory, "node_modules/@ochairo/pulse"), "@ochairo/pulse", "export const token = { stale: true };");
      }
    }
    const manifests = await Promise.all(sources.map(directory => readFile(join(directory, "package.json"), "utf8")));
    const template = join(base, "templates", ui ? "ui" : "default");
    await mkdir(template, { recursive: true });
    await writeFile(join(template, "package.json"), JSON.stringify({
      name: "{{name}}", version: "1.0.0", type: "module", dependencies: {}, scripts: { install: forbiddenScript },
    }));
    await main([target, "--workspace", workspace, ...(ui ? ["--ui"] : [])], base);

    async function verifyInstalledApp(): Promise<void> {
      for (const directory of sources) {
        const name = basename(directory);
        expect((await lstat(join(target, "node_modules/@ochairo", name))).isSymbolicLink()).toBe(false);
      }
      const result = await execute(process.execPath, ["--input-type=module", "-e", `
        import assert from "node:assert/strict";
        import { token } from "@ochairo/pulse";
        import { token as beatToken, value } from "@ochairo/beat";
        assert.equal(token, beatToken);
        assert.equal(value, "transitive dependency loaded");
        ${ui ? 'const ui = await import("@ochairo/beat-ui"); assert.equal(ui.direct, token); assert.equal(ui.viaBeat, token);' : ""}
        console.log("workspace runtime passed");
      `], { cwd: target });
      expect(result.stdout.trim()).toBe("workspace runtime passed");
      for (const directory of [target, extra, join(target, "node_modules/workspace-extra"), ...sources, ...sources.map(directory => join(target, "node_modules/@ochairo", basename(directory)))]) {
        await expect(lstat(join(directory, "HOOK_RAN"))).rejects.toMatchObject({ code: "ENOENT" });
      }
    }
    await verifyInstalledApp();
    // npm ci must reproduce the packed install from the project's persisted config.
    vi.stubEnv("npm_config_install_links", undefined);
    await execute(process.execPath, [npm, "ci", "--ignore-scripts", "--no-audit", "--no-fund", "--workspaces=false", "--global=false", "--prefix=."], { cwd: target });
    await verifyInstalledApp();
    expect(await Promise.all(sources.map(directory => readFile(join(directory, "package.json"), "utf8")))).toEqual(manifests);
    for (const directory of sources) {
      await expect(lstat(join(directory, "package-lock.json"))).rejects.toMatchObject({ code: "ENOENT" });
      if (!preinstalled) await expect(lstat(join(directory, "node_modules"))).rejects.toMatchObject({ code: "ENOENT" });
    }

    // Refresh a rebuilt snapshot with the documented removal and retry procedure.
    await writeFile(join(beat, "index.js"), `${await readFile(join(beat, "index.js"), "utf8")}\nexport const rebuilt = true;`);
    await rm(join(target, "node_modules/@ochairo/beat"), { recursive: true });
    await execute(process.execPath, [npm, ...INSTALL_ARGUMENTS], { cwd: target });
    await verifyInstalledApp();
    await execute(process.execPath, ["--input-type=module", "-e", 'import assert from "node:assert/strict"; import { rebuilt } from "@ochairo/beat"; assert.equal(rebuilt, true);'], { cwd: target });
  }, 30_000);
});
