import { afterEach, describe, expect, it, vi } from "vitest";
import { link, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { scaffoldBeatApp } from "../src/scaffold.js";
import { createServer } from "node:net";

const baseDir = resolve(import.meta.dirname, "..");
const ownedRoots: string[] = [];

async function scratch(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "beat-create-security-"));
  ownedRoots.push(root);
  return root;
}

afterEach(async () => {
  vi.restoreAllMocks();
  for (const root of ownedRoots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe("scaffold filesystem boundaries", () => {
  it("rejects an empty API workspace instead of selecting ambient packages", async () => {
    const root = await scratch();
    for (const name of ["beat", "pulse"]) {
      await mkdir(join(root, name));
      await writeFile(join(root, name, "package.json"), JSON.stringify({ name: `@ochairo/${name}` }));
    }
    vi.spyOn(process, "cwd").mockReturnValue(root);
    await expect(scaffoldBeatApp({ force: false, packageName: "app", targetDirectory: join(root, "app"), workspaceRoot: "" }, baseDir)).rejects.toThrow("Workspace directory cannot be empty");
    await expect(readFile(join(root, "app/package.json"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects an empty API destination before force can modify the current directory", async () => {
    const root = await scratch();
    await writeFile(join(root, "package.json"), "sentinel");
    vi.spyOn(process, "cwd").mockReturnValue(root);
    await expect(scaffoldBeatApp({ force: true, packageName: "app", targetDirectory: "" }, baseDir)).rejects.toThrow("cannot be empty");
    expect(await readFile(join(root, "package.json"), "utf8")).toBe("sentinel");
  });

  it.skipIf(process.platform === "win32")("rejects special template files before output", async () => {
    const root = await scratch();
    const template = join(root, "source/templates/default");
    await mkdir(template, { recursive: true });
    const server = createServer();
    await new Promise<void>((ready, reject) => {
      server.once("error", reject);
      server.listen(join(template, "socket"), ready);
    });
    try {
      await expect(scaffoldBeatApp({ force: false, packageName: "app", targetDirectory: join(root, "app") }, join(root, "source"))).rejects.toThrow("ordinary file");
      await expect(readFile(join(root, "app/package.json"))).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await new Promise<void>((closed, reject) => server.close(error => error ? reject(error) : closed()));
    }
  });

  it("rejects linked workspace packages even when the root was explicitly selected", async () => {
    const root = await scratch();
    const external = join(root, "external");
    await mkdir(external);
    await writeFile(join(external, "package.json"), JSON.stringify({ name: "@ochairo/beat" }));
    await symlink(external, join(root, "beat"));
    await expect(scaffoldBeatApp({ force: false, packageName: "app", targetDirectory: join(root, "app"), workspaceRoot: root }, baseDir)).rejects.toThrow("ordinary");
    await expect(readFile(join(root, "app/package.json"))).rejects.toMatchObject({ code: "ENOENT" });
  });
  it("requires explicit workspace selection and validates required UI packages", async () => {
    const root = await scratch();
    for (const name of ["beat", "pulse"]) {
      await mkdir(join(root, name));
      await writeFile(join(root, name, "package.json"), JSON.stringify({ name: `@ochairo/${name}` }));
    }
    const target = join(root, "app");
    await scaffoldBeatApp({ force: false, packageName: "app", targetDirectory: target, workspaceRoot: root }, baseDir);
    const pkg = JSON.parse(await readFile(join(target, "package.json"), "utf8"));
    expect(pkg.dependencies["@ochairo/beat"]).toBe("file:../beat");
    expect(pkg.overrides).toEqual({ "@ochairo/beat": "$@ochairo/beat", "@ochairo/pulse": "$@ochairo/pulse" });
    expect(pkg.pnpm).toBeUndefined();
    expect(await readFile(join(target, ".npmrc"), "utf8")).toBe("install-links=true\n");
    await expect(scaffoldBeatApp({ force: false, packageName: "ui", targetDirectory: join(root, "ui"), workspaceRoot: root, ui: true }, baseDir)).rejects.toThrow();
    await expect(readFile(join(root, "ui/package.json"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("refuses a linked target root", async () => {
    const root = await scratch();
    const external = join(root, "external");
    await mkdir(external);
    await symlink(external, join(root, "app"));
    await expect(scaffoldBeatApp({ force: true, packageName: "app", targetDirectory: join(root, "app") }, baseDir)).rejects.toThrow("symbolic link");
    await expect(readFile(join(external, "package.json"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("preflights generated workspace npm configuration before any forced writes", async () => {
    const root = await scratch();
    for (const name of ["beat", "pulse"]) {
      await mkdir(join(root, name));
      await writeFile(join(root, name, "package.json"), JSON.stringify({ name: `@ochairo/${name}` }));
    }
    const target = join(root, "app");
    const external = join(root, "external.npmrc");
    await mkdir(target);
    await writeFile(external, "sentinel");
    await writeFile(join(target, "package.json"), "existing project");
    await symlink(external, join(target, ".npmrc"));
    await expect(scaffoldBeatApp({ force: true, packageName: "app", targetDirectory: target, workspaceRoot: root }, baseDir)).rejects.toThrow();
    expect(await readFile(external, "utf8")).toBe("sentinel");
    expect(await readFile(join(target, "package.json"), "utf8")).toBe("existing project");
  });

  it("rejects a template that collides with generated workspace npm configuration", async () => {
    const root = await scratch();
    for (const name of ["beat", "pulse"]) {
      await mkdir(join(root, name));
      await writeFile(join(root, name, "package.json"), JSON.stringify({ name: `@ochairo/${name}` }));
    }
    const source = join(root, "source");
    const template = join(source, "templates/default");
    await mkdir(template, { recursive: true });
    await writeFile(join(template, "package.json"), JSON.stringify({ dependencies: {} }));
    await writeFile(join(template, ".npmrc"), "install-links=false");
    const target = join(root, "app");
    await expect(scaffoldBeatApp({ force: false, packageName: "app", targetDirectory: target, workspaceRoot: root }, source)).rejects.toThrow("Duplicate template destination: .npmrc");
    await expect(readFile(join(target, "package.json"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("refuses linked template entries before creating the target", async () => {
    const root = await scratch();
    const template = join(root, "source/templates/default");
    await mkdir(template, { recursive: true });
    await writeFile(join(root, "outside.txt"), "private sentinel");
    await symlink(join(root, "outside.txt"), join(template, "copied.txt"));
    const target = join(root, "app");
    await expect(scaffoldBeatApp({ force: false, packageName: "app", targetDirectory: target }, join(root, "source"))).rejects.toThrow("Unsafe template");
    await expect(readFile(join(target, "copied.txt"))).rejects.toMatchObject({ code: "ENOENT" });
  });
  it("refuses a destination file symlink without changing its external target", async () => {
    const root = await scratch();
    const target = join(root, "app");
    const external = join(root, "external.json");
    await mkdir(target);
    await writeFile(external, "sentinel");
    await symlink(external, join(target, "package.json"));
    await expect(scaffoldBeatApp({ force: true, packageName: "app", targetDirectory: target }, baseDir)).rejects.toThrow();
    expect(await readFile(external, "utf8")).toBe("sentinel");
  });

  it("refuses destination directory symlinks before writing template files", async () => {
    const root = await scratch();
    const target = join(root, "app");
    const external = join(root, "external");
    await mkdir(target);
    await mkdir(external);
    await writeFile(join(external, "App.tsx"), "sentinel");
    await symlink(external, join(target, "src"));
    await expect(scaffoldBeatApp({ force: true, packageName: "app", targetDirectory: target }, baseDir)).rejects.toThrow();
    expect(await readFile(join(external, "App.tsx"), "utf8")).toBe("sentinel");
    await expect(readFile(join(target, "package.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("replaces a forced destination without changing a hardlinked external inode", async () => {
    const root = await scratch();
    const target = join(root, "app");
    const external = join(root, "external.json");
    await mkdir(target);
    await writeFile(external, "sentinel");
    await link(external, join(target, "package.json"));
    await writeFile(join(target, "keep.txt"), "unrelated");
    await scaffoldBeatApp({ force: true, packageName: "app", targetDirectory: target }, baseDir);
    expect(await readFile(external, "utf8")).toBe("sentinel");
    expect(JSON.parse(await readFile(join(target, "package.json"), "utf8")).name).toBe("app");
    expect(await readFile(join(target, "keep.txt"), "utf8")).toBe("unrelated");
  });

  it("does not use ambient name-matching workspace packages", async () => {
    const root = await scratch();
    for (const name of ["beat", "pulse"]) {
      await mkdir(join(root, name));
      await writeFile(join(root, name, "package.json"), JSON.stringify({ name: `@ochairo/${name}` }));
    }
    const target = join(root, "app");
    await scaffoldBeatApp({ force: false, packageName: "app", targetDirectory: target }, baseDir);
    const pkg = JSON.parse(await readFile(join(target, "package.json"), "utf8"));
    expect(pkg.dependencies["@ochairo/beat"]).toBe("^2.0.0");
    expect(pkg.dependencies["@ochairo/pulse"]).toBe("^2.0.0");
    expect(pkg.pnpm).toBeUndefined();
    expect(pkg.overrides).toBeUndefined();
    await expect(readFile(join(target, ".npmrc"))).rejects.toMatchObject({ code: "ENOENT" });
  });
});
