# Next and ESLint foundation notes

Checked 2026-10-05 against installed Next 16.3.8 and actual build/lint runs.

- Next's declared ESLint peer range accepts 10, but its bundled React plugin calls the removed `context.getFilename()` API. ESLint 10.12.0 crashes before linting. The maintainer approved ESLint 9.39.5 as a compatibility pin. [ESLint's support table](https://eslint.org/version-support/) lists 9 as end of life; revisit when the React plugin supports 10. Do not disable lint rules to hide this crash.
- `next dev` automatically appends framework instructions to AGENTS.md. Set `agentRules: false` in `next.config.ts` to preserve this repo's authored map. Verified against `node_modules/next/dist/server/config-shared.d.ts` and `server/lib/generate-agent-files.js`.
- Turbopack's PostCSS worker needs a local IPC port, blocked here even on the escalated build. The supported `--webpack` flag succeeds; dev/build scripts use it consistently. No certificate validation or sandbox protection was disabled. [Next CLI reference](https://nextjs.org/docs/app/api-reference/cli/next).
- `next-env.d.ts` is rewritten to import generated route/root-parameter files. Run `next typegen` before `tsc --noEmit` so checks work in a fresh checkout before a build; never rely on a local dev server's generated files. [Next typegen reference](https://nextjs.org/docs/app/api-reference/cli/next#next-typegen-options).

The approved lockfile's audit reported 9 high-severity entries through Next lint tooling and Prisma CLI (braces/micromatch and deepmerge-ts/mysql2 chains). These tools process repository files/configuration here; the application uses Postgres, not mysql2. No user-input path into those tools is implemented. Remediation remains open; `npm audit fix --force` proposes incompatible top-level downgrades and has not been run.
