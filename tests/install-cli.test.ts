import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli.js";
import { INSTALL_COMMAND, installDependencies, resolveNpmCli } from "../src/install.js";

vi.mock("../src/install.js", async original => ({
  ...await original<typeof import("../src/install.js")>(),
  resolveNpmCli: vi.fn(), installDependencies: vi.fn(),
}));

const baseDir = resolve(import.meta.dirname, "..");
const roots: string[] = [];
beforeEach(() => {
  vi.mocked(resolveNpmCli).mockResolvedValue("/trusted/npm-cli.js");
  vi.mocked(installDependencies).mockResolvedValue(undefined);
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});
async function target(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "beat-create-install-cli-"));
  roots.push(root);
  return join(root, "app");
}

describe("create and install flow", () => {
  it("installs the generated app before reporting readiness", async () => {
    const path = await target();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    let finish: () => void = () => {};
    vi.mocked(installDependencies).mockImplementation(async directory => {
      expect(JSON.parse(await readFile(join(directory, "package.json"), "utf8")).name).toBe("app");
      await new Promise<void>(resolve => { finish = resolve; });
    });
    const pending = main([path], baseDir);
    await vi.waitFor(() => expect(installDependencies).toHaveBeenCalled());
    expect(log.mock.calls.flat().join("\n")).not.toContain("Created Beat app and installed dependencies");
    finish();
    await pending;
    expect(installDependencies).toHaveBeenCalledWith(path, "/trusted/npm-cli.js");
    expect(log.mock.calls.flat().join("\n")).toContain("npm run dev");
  });

  it("supports file-only creation without even resolving an installer", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await main([await target(), "--skip-install"], baseDir);
    expect(resolveNpmCli).not.toHaveBeenCalled();
    expect(installDependencies).not.toHaveBeenCalled();
    expect(log.mock.calls.flat().join("\n")).toContain(INSTALL_COMMAND);
  });

  it("rejects a missing toolchain and unsafe force combination before creating files", async () => {
    const path = await target();
    vi.mocked(resolveNpmCli).mockRejectedValue(new Error("npm unavailable"));
    await expect(main([path], baseDir)).rejects.toThrow("npm unavailable");
    await expect(stat(path)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(main([path, "--force"], baseDir)).rejects.toThrow("requires --skip-install");
    await expect(stat(path)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("preserves generated files after install failure and prints the safe retry command", async () => {
    const path = await target();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(installDependencies).mockRejectedValue(new Error("registry unavailable"));
    await expect(main([path], baseDir)).rejects.toThrow("registry unavailable");
    expect((await stat(join(path, "package.json"))).isFile()).toBe(true);
    expect(log.mock.calls.flat().join("\n")).not.toContain("Created Beat app and installed dependencies");
    expect(error.mock.calls.flat().join("\n")).toContain(INSTALL_COMMAND);
  });
});
