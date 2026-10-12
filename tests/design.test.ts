import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const forbidden = [
  /\bshadow-(?!none\b)[\w-]+/,
  /\bbg-gradient-[\w-]+/,
  /\bbackdrop-[\w-]+/,
  /\bblur-[\w-]+/,
  /\brounded-(?:xl|2xl|3xl)\b/,
  /\buppercase\b/,
  /\btracking-(?:wide|wider|widest)\b/,
  /\bfont-(?:mono|serif)\b/,
  /\b(?:bg|text|border|ring|from|via|to)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/,
  /#[\da-fA-F]{3,8}\b/,
];

describe("D6 visual guard", () => {
  it("keeps application components within the design vocabulary", () => {
    const violations: string[] = [];
    for (const file of [...sourceFiles(join(root, "app")), ...sourceFiles(join(root, "components"))]) {
      const name = relative(root, file);
      const source = readFileSync(file, "utf8");
      for (const [index, line] of source.split("\n").entries()) {
        for (const pattern of forbidden) {
          if (pattern.test(line) && !(name === "app/layout.tsx" && pattern.source.startsWith("#") && line.includes('themeColor: "#0F1F4D"'))) {
            violations.push(`${name}:${index + 1}: ${pattern}`);
          }
        }
        if (name.startsWith("components/ui/") === false && /from\s+["']lucide-react["']/.test(line)) {
          violations.push(`${name}:${index + 1}: lucide-react`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("keeps CSS to the three specified data patterns", () => {
    const css = readFileSync(join(root, "app/globals.css"), "utf8");
    expect(css).not.toMatch(/box-shadow/);
    expect(css.match(/gradient\(/g)).toHaveLength(3);
  });
});
