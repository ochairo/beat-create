import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { scaffoldBeatApp, sanitizePackageName } from "../src/scaffold";

const FIXTURES_DIR = resolve(import.meta.dirname, "__fixtures__");
const TEMPLATES_DIR = resolve(import.meta.dirname, "..");

function cleanFixtures(): void {
  if (existsSync(FIXTURES_DIR)) {
    rmSync(FIXTURES_DIR, { recursive: true });
  }
}

describe("sanitizePackageName", () => {
  it("lowercases and trims", () => {
    expect(sanitizePackageName("  My-App  ")).toBe("my-app");
  });

  it("replaces invalid characters with hyphens", () => {
    expect(sanitizePackageName("my app!@#$test")).toBe("my-app-test");
  });

  it("strips leading and trailing hyphens", () => {
    expect(sanitizePackageName("---app---")).toBe("app");
  });

  it("defaults to beat-app for empty input", () => {
    expect(sanitizePackageName("")).toBe("beat-app");
    expect(sanitizePackageName("   ")).toBe("beat-app");
  });
});

describe("scaffoldBeatApp", () => {
  beforeEach(cleanFixtures);
  afterEach(cleanFixtures);

  it("creates files from the default template", async () => {
    const targetDirectory = resolve(FIXTURES_DIR, "test-app");

    const result = await scaffoldBeatApp(
      {
        force: false,
        packageName: "test-app",
        targetDirectory,
      },
      TEMPLATES_DIR,
    );

    expect(result.packageName).toBe("test-app");
    expect(result.ui).toBe(false);
    expect(existsSync(resolve(targetDirectory, "package.json"))).toBe(true);
    expect(existsSync(resolve(targetDirectory, "index.html"))).toBe(true);
    expect(existsSync(resolve(targetDirectory, "src/App.tsx"))).toBe(true);
    expect(existsSync(resolve(targetDirectory, "src/main.tsx"))).toBe(true);

    const pkg = JSON.parse(
      readFileSync(resolve(targetDirectory, "package.json"), "utf8"),
    );
    expect(pkg.name).toBe("test-app");
  });

  it("replaces {{name}} placeholder in files", async () => {
    const targetDirectory = resolve(FIXTURES_DIR, "named-app");

    await scaffoldBeatApp(
      {
        force: false,
        packageName: "my-cool-app",
        targetDirectory,
      },
      TEMPLATES_DIR,
    );

    const pkg = JSON.parse(
      readFileSync(resolve(targetDirectory, "package.json"), "utf8"),
    );
    expect(pkg.name).toBe("my-cool-app");
  });

  it("throws when target is not empty and force is false", async () => {
    const targetDirectory = resolve(FIXTURES_DIR, "non-empty");

    await scaffoldBeatApp(
      {
        force: false,
        packageName: "first",
        targetDirectory,
      },
      TEMPLATES_DIR,
    );

    await expect(
      scaffoldBeatApp(
        {
          force: false,
          packageName: "second",
          targetDirectory,
        },
        TEMPLATES_DIR,
      ),
    ).rejects.toThrow("Target directory is not empty");
  });

  it("overwrites when force is true", async () => {
    const targetDirectory = resolve(FIXTURES_DIR, "force-app");

    await scaffoldBeatApp(
      {
        force: false,
        packageName: "first",
        targetDirectory,
      },
      TEMPLATES_DIR,
    );

    const result = await scaffoldBeatApp(
      {
        force: true,
        packageName: "overwritten",
        targetDirectory,
      },
      TEMPLATES_DIR,
    );

    expect(result.packageName).toBe("overwritten");
    const pkg = JSON.parse(
      readFileSync(resolve(targetDirectory, "package.json"), "utf8"),
    );
    expect(pkg.name).toBe("overwritten");
  });

  it("creates files from the ui template", async () => {
    const targetDirectory = resolve(FIXTURES_DIR, "ui-app");

    const result = await scaffoldBeatApp(
      {
        force: false,
        packageName: "ui-app",
        targetDirectory,
        ui: true,
      },
      TEMPLATES_DIR,
    );

    expect(result.ui).toBe(true);
    expect(existsSync(resolve(targetDirectory, "package.json"))).toBe(true);
    expect(existsSync(resolve(targetDirectory, "src/App.tsx"))).toBe(true);
    expect(existsSync(resolve(targetDirectory, "src/layout/Layout.tsx"))).toBe(
      true,
    );
    expect(
      existsSync(resolve(targetDirectory, "src/pages/ComponentsPage.tsx")),
    ).toBe(true);
  });
});
