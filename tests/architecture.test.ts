import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint();
async function violations(filePath: string, source: string) {
  const [result] = await eslint.lintText(source, { filePath });
  return result.messages.filter((message) => message.ruleId?.startsWith("no-restricted"));
}

describe("architecture import boundaries", () => {
  it.each([
    ["lib/engine/plan.ts", "import { db } from '@/lib/db'; void db;"],
    ["lib/engine/plan.ts", "import { db } from '../db'; void db;"],
    ["lib/engine/plan.ts", "import fs from 'node:fs'; void fs;"],
    ["lib/engine/plan.ts", "import { score } from '@/lib/risk/score'; void score;"],
    ["lib/risk/score.ts", "import { getNow } from '../clock'; void getNow;"],
    ["lib/ai/cache.ts", "import { getPlan } from '@/lib/services/plans'; void getPlan;"],
    ["lib/services/plans.ts", "import Page from '../../app/page'; void Page;"],
    ["app/page.tsx", "import { db } from '@/lib/db'; void db;"],
    ["components/shared/Example.tsx", "'use client'; import { getPlan } from '@/lib/services/plans'; void getPlan;"],
    ["app/example/page.tsx", "'use client'; import { getPlan } from '../../lib/services/plans'; void getPlan;"],
  ])("rejects a layer bypass in %s", async (filePath, source) => {
    expect((await violations(filePath, source)).length).toBeGreaterThan(0);
  });
  it.each([
    ["lib/engine/plan.ts", "import { t } from '@/lib/i18n'; void t;"],
    ["lib/risk/score.ts", "import { buildPlan } from '@/lib/engine/plan'; void buildPlan;"],
    ["lib/ai/cache.ts", "import { db } from '../db'; void db;"],
    ["lib/services/plans.ts", "import { db } from '../db'; void db;"],
    ["app/page.tsx", "import { getPlan } from '@/lib/services/plans'; void getPlan;"],
    ["app/page.tsx", "import { getClockView } from '@/lib/services/clock'; void getClockView;"],
    ["app/api/clock/route.ts", "import { getClockView } from '../../../lib/services/clock'; void getClockView;"],
    ["components/shared/Example.tsx", "'use client'; import { t } from '@/lib/i18n'; void t;"],
  ])("allows the documented dependency in %s", async (filePath, source) => {
    expect(await violations(filePath, source)).toEqual([]);
  });
});
