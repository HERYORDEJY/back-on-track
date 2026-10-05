import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Covers aliases and relative imports naming a forbidden layer.
const layer = (names) => `(^|/)(?:${names.join("|")})(?:/|\\.|$)`;
const restricted = (names, pure = false) => ["error", {
  patterns: [
    { regex: layer(names), message: "Use the layers documented in ARCHITECTURE.md." },
    ...(pure ? [{ regex: "^(node:|next(?:/|$)|react(?:/|$)|(?:fs|http|https|net|child_process|path|os)(?:/|$))", message: "Domain logic does no I/O." }] : []),
  ],
}];

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([".next/**", "out/**", "coverage/**", "lib/generated/**", "next-env.d.ts"]),
  {
    files: ["lib/engine/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restricted(["db", "ai", "clock", "services", "risk", "offline", "app", "components"], true),
      "no-restricted-globals": ["error", "fetch", "window", "document", "localStorage", "process"],
    },
  },
  {
    files: ["lib/risk/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restricted(["db", "ai", "clock", "services", "offline", "app", "components"], true),
      "no-restricted-globals": ["error", "fetch", "window", "document", "localStorage", "process"],
    },
  },
  { files: ["lib/ai/**/*.{ts,tsx}"], rules: { "no-restricted-imports": restricted(["services", "app", "components"]) } },
  { files: ["lib/services/**/*.{ts,tsx}"], rules: { "no-restricted-imports": restricted(["app", "components"]) } },
  { files: ["app/**/*.{ts,tsx}"], rules: { "no-restricted-imports": restricted(["db", "ai", "clock", "engine", "risk"]) } },
  {
    files: ["components/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", {
        selector: "Program:has(ExpressionStatement[directive='use client']) > ImportDeclaration[source.value=/(@\\/lib\\/(services|db|ai|clock|engine|risk)|(^|\\/)(services|db|ai|clock|engine|risk)(\\/|\\.|$))/]",
        message: "Client components call API routes; they cannot import server or domain layers.",
      }],
    },
  },
]);
