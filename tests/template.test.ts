import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  collectTemplateFiles,
  resolveTemplateDirectory,
} from "../src/template";

const TEMPLATES_ROOT = resolve(import.meta.dirname, "..", "templates");

describe("resolveTemplateDirectory", () => {
  it("returns default directory when ui is false", () => {
    expect(resolveTemplateDirectory(false, TEMPLATES_ROOT)).toBe(
      resolve(TEMPLATES_ROOT, "default"),
    );
  });

  it("returns ui directory when ui is true", () => {
    expect(resolveTemplateDirectory(true, TEMPLATES_ROOT)).toBe(
      resolve(TEMPLATES_ROOT, "ui"),
    );
  });
});

describe("collectTemplateFiles", () => {
  it("collects files from template directory", () => {
    const templateDir = resolveTemplateDirectory(false, TEMPLATES_ROOT);

    const files = collectTemplateFiles(
      templateDir,
      "test-app",
      "/tmp/test-app",
      undefined,
      false,
    );

    expect(files["index.html"]).toBeDefined();
    expect(files["tsconfig.json"]).toBeDefined();
    expect(files["vite.config.ts"]).toBeDefined();
    expect(files["package.json"]).toBeDefined();
    expect(files["src/App.tsx"]).toBeDefined();
    expect(files["src/main.tsx"]).toBeDefined();
    expect(files[".gitignore"]).toContain("node_modules");
    expect(files["_gitignore"]).toBeUndefined();
  });

  it("replaces {{name}} in file contents", () => {
    const templateDir = resolveTemplateDirectory(false, TEMPLATES_ROOT);

    const files = collectTemplateFiles(
      templateDir,
      "my-app",
      "/tmp/my-app",
      undefined,
      false,
    );

    expect(files["package.json"]).toContain('"my-app"');
    expect(files["index.html"]).toContain("my-app");
  });
});
