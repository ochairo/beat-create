import { mkdtemp, mkdir, open, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { writeScaffoldFiles } from "../src/filesystem.js";

vi.mock("node:fs/promises", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return { ...original, open: vi.fn(original.open), rename: vi.fn(original.rename) };
});
const original = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
const roots: string[] = [];
async function scratch(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "beat-create-write-"));
  roots.push(root);
  return root;
}
afterEach(async () => {
  vi.mocked(open).mockReset().mockImplementation(original.open);
  vi.mocked(rename).mockReset().mockImplementation(original.rename);
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe("per-file scaffold publication", () => {
  it("refuses a file created after preflight without truncating it", async () => {
    const root = await scratch();
    vi.mocked(open).mockImplementationOnce(async (path, flags, mode) => {
      await original.writeFile(path, "another writer", { flag: "wx" });
      return original.open(path, flags, mode);
    });
    await expect(writeScaffoldFiles(root, { "first.txt": "new", "later.txt": "later" }, false)).rejects.toThrow("0 completed");
    expect(await readFile(join(root, "first.txt"), "utf8")).toBe("another writer");
    expect(await readdir(root)).toEqual(["first.txt"]);
  });

  it("keeps the original and removes its temporary file when rename fails", async () => {
    const root = await scratch();
    await writeFile(join(root, "first.txt"), "original");
    vi.mocked(rename).mockRejectedValueOnce(Object.assign(new Error("rename denied"), { code: "EACCES" }));
    await expect(writeScaffoldFiles(root, { "first.txt": "new", "later.txt": "later" }, true)).rejects.toThrow("0 completed");
    expect(await readFile(join(root, "first.txt"), "utf8")).toBe("original");
    expect(await readdir(root)).toEqual(["first.txt"]);
  });

  it("closes and removes a failed forced write without touching the original", async () => {
    const root = await scratch();
    await writeFile(join(root, "first.txt"), "original");
    vi.mocked(open).mockImplementationOnce(async (path, flags, mode) => {
      const handle = await original.open(path, flags, mode);
      vi.spyOn(handle, "writeFile").mockRejectedValueOnce(new Error("write failed"));
      return handle;
    });
    await expect(writeScaffoldFiles(root, { "first.txt": "new" }, true)).rejects.toThrow("0 completed");
    expect(await readFile(join(root, "first.txt"), "utf8")).toBe("original");
    expect(await readdir(root)).toEqual(["first.txt"]);
  });

  it("preflights later conflicts before publishing any file", async () => {
    const root = await scratch();
    await mkdir(join(root, "later.txt"));
    await expect(writeScaffoldFiles(root, { "first.txt": "new", "later.txt": "later" }, true)).rejects.toThrow("ordinary file");
    expect(await readdir(root)).toEqual(["later.txt"]);
  });

  it("rejects escaping template paths before mutation", async () => {
    const root = await scratch();
    await expect(writeScaffoldFiles(root, { "../escape.txt": "bad" }, false)).rejects.toThrow("escapes");
    expect(await readdir(root)).toEqual([]);
  });
});
