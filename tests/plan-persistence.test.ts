import { expect, it, vi } from "vitest";
import { buildPlan } from "@/lib/engine/plan";
import { personaInput } from "./engine/fixtures";
import { savePlanInTransaction } from "@/lib/services/plans";

it("writes the plan before its child sessions and reminders", async () => {
  const result = await buildPlan(personaInput("amaka"), async () => null);
  const saved = { plan: false, sessions: new Set<string>() };
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: "amaka" }]),
    plan: {
      findFirst: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockImplementation(async ({ data }) => {
        if (data.sessions) throw new Error("Session_planId_fkey");
        saved.plan = true;
        return data;
      }),
    },
    planItem: { createMany: vi.fn().mockImplementation(async () => { expect(saved.plan).toBe(true); }) },
    session: { createMany: vi.fn().mockImplementation(async ({ data }) => { expect(saved.plan).toBe(true); for (const row of data) saved.sessions.add(row.id); }) },
    reminder: { createMany: vi.fn().mockImplementation(async ({ data }) => { for (const row of data) expect(saved.sessions.has(row.sessionId)).toBe(true); }) },
    student: { update: vi.fn().mockResolvedValue({}) },
  };
  await savePlanInTransaction(tx as never, "amaka", personaInput("amaka").now, result);
  expect(tx.plan.create).toHaveBeenCalledTimes(1);
  expect(tx.session.createMany).toHaveBeenCalledTimes(1);
  expect(tx.reminder.createMany).toHaveBeenCalledTimes(1);
});
