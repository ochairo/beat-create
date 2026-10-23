import { ChildProcess, spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { INSTALL_ARGUMENTS, installDependencies, resolveNpmCli } from "../src/install.js";

vi.mock("node:child_process", async original => ({
  ...await original<typeof import("node:child_process")>(),
  spawn: vi.fn(),
}));

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function fakeNpm(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "beat-create-npm-"));
  roots.push(root);
  await mkdir(join(root, "npm/bin"), { recursive: true });
  await writeFile(join(root, "npm/package.json"), JSON.stringify({ name: "npm", version: "11.19.1" }));
  const cli = join(root, "npm/bin/npm-cli.js");
  await writeFile(cli, "throw new Error('Fixture must never execute');");
  return cli;
}

describe("npm entry resolution", () => {
  it("accepts the running Node's standard npm when the invocation directory contains the toolchain", async () => {
    vi.stubEnv("npm_execpath", "");
    vi.spyOn(process, "cwd").mockReturnValue("/");
    expect(await resolveNpmCli("/tmp/new-beat-project")).toMatch(/npm-cli\.js$/);
    await expect(resolveNpmCli("/")).rejects.toThrow("not found");
  });

  it("accepts an explicit standard JavaScript toolchain entry without executing it", async () => {
    const cli = await fakeNpm();
    vi.stubEnv("npm_execpath", cli);
    expect(await resolveNpmCli("/tmp/new-beat-project")).toBe(cli);
  });

  it("does not select a project-local entry disguised by an external symlink", async () => {
    const cli = await fakeNpm();
    const project = roots[roots.length - 1]!;
    const aliases = await mkdtemp(join(tmpdir(), "beat-create-npm-alias-"));
    roots.push(aliases);
    const alias = join(aliases, "npm-cli.js");
    await symlink(cli, alias);
    vi.stubEnv("npm_execpath", alias);
    vi.spyOn(process, "cwd").mockReturnValue(project);
    expect(await resolveNpmCli(join(project, "app"))).not.toBe(cli);
  });
});

describe("installer lifecycle", () => {
  function child(): ChildProcess {
    const instance = new ChildProcess();
    vi.mocked(spawn).mockReturnValue(instance);
    return instance;
  }

  it("uses the current Node with fixed arguments, no shell, and the exact project cwd", async () => {
    const instance = child();
    const target = "/tmp/app ; $(not-a-command)";
    const pending = installDependencies(target, "/trusted/npm-cli.js");
    expect(spawn).toHaveBeenCalledWith(process.execPath, ["/trusted/npm-cli.js", ...INSTALL_ARGUMENTS], {
      cwd: target, shell: false, stdio: "inherit",
    });
    instance.emit("close", 0, null);
    await pending;
  });

  it("rejects spawn errors, nonzero exits, and termination signals", async () => {
    for (const outcome of ["error", "exit", "signal"]) {
      const instance = child();
      const pending = installDependencies("/tmp/app", "/trusted/npm-cli.js");
      const rejection = expect(pending).rejects.toThrow();
      if (outcome === "error") instance.emit("error", new Error("spawn failure"));
      instance.emit("close", outcome === "exit" ? 1 : null, outcome === "signal" ? "SIGTERM" : null);
      await rejection;
    }
  });

  it("waits for cancellation to terminate, rejects even exit zero, and restores signal listeners", async () => {
    const instance = child();
    const kill = vi.spyOn(instance, "kill").mockReturnValue(true);
    const before = process.listenerCount("SIGINT");
    const pending = installDependencies("/tmp/app", "/trusted/npm-cli.js");
    let settled = false;
    const rejection = expect(pending).rejects.toThrow("SIGINT").finally(() => { settled = true; });
    process.emit("SIGINT");
    await Promise.resolve();
    expect(kill).toHaveBeenCalledWith("SIGINT");
    expect(settled).toBe(false);
    instance.emit("close", 0, null);
    await rejection;
    expect(process.listenerCount("SIGINT")).toBe(before);
  });
});
