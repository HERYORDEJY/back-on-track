#!/usr/bin/env node
// Keeps the docs honest: links resolve, every doc is routed from AGENTS.md,
// AGENTS.md stays short, and PLANS.md keeps its status table.
// Run with `npm run docs:check` (part of `npm run check`). No dependencies.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MAX_AGENTS_LINES = 120;
const errors = [];

const rel = (p) => relative(root, p) || ".";
const read = (p) => readFileSync(p, "utf8");

function listMarkdown(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return listMarkdown(full);
    return name.endsWith(".md") ? [full] : [];
  });
}

// Drop fenced code blocks so examples inside them aren't checked.
const stripFences = (text) => text.replace(/^```[\s\S]*?^```/gm, "");

const rootDocs = ["AGENTS.md", "ARCHITECTURE.md", "CAPSTONE_PROJECT_BRIEF.md", "CODEX_LOG.md"].map((f) => join(root, f));
const files = [...rootDocs.filter(existsSync), ...listMarkdown(join(root, "docs"))];

for (const required of rootDocs) {
  if (!existsSync(required)) errors.push(`Missing ${rel(required)}`);
}

// 1. AGENTS.md stays a short map.
const agentsPath = join(root, "AGENTS.md");
if (existsSync(agentsPath)) {
  const lines = read(agentsPath).split("\n").length;
  if (lines > MAX_AGENTS_LINES) {
    errors.push(`AGENTS.md has ${lines} lines (max ${MAX_AGENTS_LINES}). Move detail into docs/.`);
  }
}

// 2. Every relative markdown link resolves.
for (const file of files) {
  const text = stripFences(read(file));
  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const path = resolve(dirname(file), target.split("#")[0]);
    if (!existsSync(path)) errors.push(`${rel(file)}: broken link to ${target}`);
  }
}

// 3. Backticked .md paths point at real docs (outside docs/references, which names future files).
for (const file of files.filter((f) => !f.includes(join("docs", "references")))) {
  const text = stripFences(read(file));
  for (const [, target] of text.matchAll(/`([A-Za-z0-9_./-]+\.md)`/g)) {
    const candidates = [resolve(dirname(file), target), resolve(root, target), resolve(root, "docs", target)];
    if (!candidates.some(existsSync)) errors.push(`${rel(file)}: \`${target}\` doesn't exist`);
  }
}

// 4. Every doc under docs/ is routed from AGENTS.md (progressive disclosure only works if it's reachable).
if (existsSync(agentsPath)) {
  const agents = read(agentsPath);
  const routed = new Set(
    [...agents.matchAll(/\]\(([^)\s]+)\)/g)].map(([, t]) => resolve(root, t.split("#")[0])),
  );
  const mustRoute = [
    ...listMarkdown(join(root, "docs")).filter((f) => dirname(f) === join(root, "docs")),
    ...listMarkdown(join(root, "docs", "specs")),
    join(root, "ARCHITECTURE.md"),
    join(root, "CAPSTONE_PROJECT_BRIEF.md"),
  ];
  for (const doc of mustRoute) {
    if (!routed.has(doc)) errors.push(`AGENTS.md routing table doesn't link ${rel(doc)}`);
  }
}

// 5. PLANS.md keeps its status table.
const plansPath = join(root, "docs", "PLANS.md");
if (!existsSync(plansPath)) errors.push("Missing docs/PLANS.md");
else if (!/^## Status$/m.test(read(plansPath))) errors.push("docs/PLANS.md has no '## Status' section");

if (errors.length) {
  console.error(`docs:check failed (${errors.length}):\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log(`docs:check passed: ${files.length} docs, links resolve, every doc is routed.`);
