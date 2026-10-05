import { describe, expect, it } from "vitest";
import { advanceClock, calendarDate, CLOCK_LIMIT, clockWeek, DEMO_START, parseClock, type ClockJump } from "@/lib/clock";

describe("simulated clock", () => {
  it("starts on Monday of week 7, using Lagos calendar dates", () => {
    expect(calendarDate(parseClock(DEMO_START))).toBe("2026-10-19");
    expect(clockWeek(parseClock(DEMO_START))).toBe(7);
    expect(clockWeek(new Date("2026-10-25T23:05:00Z"))).toBe(8);
  });
  it("advances days without changing the Lagos time of day or mutating its input", () => {
    const now = parseClock(DEMO_START);
    expect(advanceClock(now, { jumpDays: 3 }).toISOString()).toBe("2026-10-22T17:00:00.000Z");
    expect(now.toISOString()).toBe(DEMO_START);
  });
  it("jumps to Monday 18:00 Lagos of a later week", () => {
    expect(advanceClock(parseClock(DEMO_START), { toWeek: 10 }).toISOString()).toBe("2026-11-09T17:00:00.000Z");
  });
  it.each([{ jumpDays: 1000 }, { toWeek: 1000 }, { jumpDays: Number.MAX_SAFE_INTEGER }])("stops an overshoot at the approved limit: %j", (jump) => {
    expect(advanceClock(parseClock(DEMO_START), jump).toISOString()).toBe(CLOCK_LIMIT);
  });
  it("stays at the limit when another forward jump is requested", () => {
    expect(advanceClock(parseClock(CLOCK_LIMIT), { jumpDays: 1 }).toISOString()).toBe(CLOCK_LIMIT);
  });
  it.each([{ jumpDays: 0 }, { jumpDays: -1 }, { jumpDays: 1.5 }, { toWeek: 7 }, { toWeek: 6 }, { toWeek: 8.5 }, { jumpDays: Infinity }, { jumpDays: 1, toWeek: 8 }, {}])("rejects non-forward or ambiguous jumps: %j", (jump) => {
    expect(() => advanceClock(parseClock(DEMO_START), jump as ClockJump)).toThrow("CLOCK_JUMP_INVALID");
  });
  it.each(["invalid", "2026-10-18T17:00:00Z", "2026-11-30T17:00:01Z"])("rejects a corrupt/out-of-bounds stored clock: %s", (value) => {
    expect(() => parseClock(value)).toThrow("CLOCK_INVALID");
  });
});
