import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";

const srcRoot = path.dirname(fileURLToPath(import.meta.url));
const forbiddenPatterns = [
  "ActionManager",
  "HighlightLayer",
  "SelectionOutlineLayer",
  "onPointer",
  "scene.pick",
];

function getSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const entryPath = path.join(dir, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      return getSourceFiles(entryPath);
    }

    if (!entryPath.endsWith(".ts") || entryPath.endsWith(".test.ts")) {
      return [];
    }

    return [entryPath];
  });
}

describe("ABB 6700 presentation-free contract", () => {
  it("keeps interaction-state rendering and pointer detection out of src/", () => {
    const source = getSourceFiles(srcRoot).map((filePath) => ({
      filePath,
      content: readFileSync(filePath, "utf8"),
    }));

    for (const pattern of forbiddenPatterns) {
      const matches = source
        .filter(({ content }) => content.includes(pattern))
        .map(({ filePath }) => path.relative(srcRoot, filePath));

      expect(matches, `${pattern} should not appear in src/`).toEqual([]);
    }
  });
});
