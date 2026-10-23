import { execFileSync } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli.js";

const baseDir = resolve(import.meta.dirname, "..");
const roots: string[] = [];
async function scratch(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "beat-create-cli-"));
  roots.push(root);
  return root;
}
afterEach(async () => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe("CLI destination output", () => {
  it.skipIf(process.platform === "win32")("quotes the actual nested destination without executing shell syntax", async () => {
    const root = await scratch();
    const target = join(root, "nested", "app ' quoted ; $(touch PWN)");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await main([target, "--skip-install"], baseDir);
    const commands = log.mock.calls.map(([line]) => String(line)).filter(line => line.startsWith("  cd "));
    expect(commands).toHaveLength(1);
    const selected = execFileSync("/bin/sh", ["-c", `${commands[0]}\npwd`], { cwd: root, encoding: "utf8" }).trimEnd();
    expect(selected).toBe(target);
    await expect(stat(join(root, "PWN"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.skipIf(process.platform === "win32")("escapes terminal controls and omits copyable commands for such paths", async () => {
    const root = await scratch();
    const target = join(root, "app\u001b[31m\nline");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await main([target, "--skip-install"], baseDir);
    const output = log.mock.calls.map(([line]) => String(line));
    expect(output.join("\n")).not.toContain("\u001b");
    expect(output.join("\n")).toContain("\\u001b");
    expect(output.join("\n")).toContain("\\u000a");
    expect(output.some(line => line.startsWith("  cd "))).toBe(false);
  });

  it("rejects ambiguous or incomplete options before scaffolding", async () => {
    await expect(main(["", "--force"], baseDir)).rejects.toThrow("cannot be empty");
    await expect(main(["one", "two"], baseDir)).rejects.toThrow("one project directory");
    await expect(main(["--workspace"], baseDir)).rejects.toThrow("explicit directory");
    await expect(main(["--workspace", "--ui"], baseDir)).rejects.toThrow("explicit directory");
  });

  it("treats arguments after -- as a destination, including help-like names", async () => {
    const root = await scratch();
    vi.spyOn(process, "cwd").mockReturnValue(root);
    vi.spyOn(console, "log").mockImplementation(() => {});
    await main(["--skip-install", "--", "--help"], baseDir);
    expect((await stat(join(root, "--help", "package.json"))).isFile()).toBe(true);
  });
});
