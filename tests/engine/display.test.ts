import { describe, expect, it } from "vitest";
import { buildStops, doneThroughWeek, miniPositions, timeBarWidths } from "@/lib/engine/display";

const now = new Date("2026-10-08T12:00:00+01:00");
const availability = { mon: 20, tue: 0, wed: 30, thu: 40, fri: 0, sat: 20, sun: 0 };

describe("read-only progress and line helpers", () => {
  it("counts only consecutive fully completed weeks as of now", () => {
    const topics = [{ id: "a", week: 1 }, { id: "b", week: 1 }, { id: "c", week: 2 }, { id: "d", week: 3 }];
    const progress = [{ topicId: "a", completedAt: now }, { topicId: "b", completedAt: new Date("2026-10-08T13:00:00+01:00") }, { topicId: "c", completedAt: now }];
    expect(doneThroughWeek(topics, progress, now)).toBe(0);
    expect(doneThroughWeek(topics, [{ ...progress[1], completedAt: now }, ...progress.slice(0, 1), progress[2]], now)).toBe(2);
  });

  it("clamps line positions and uses one common scale for bars", () => {
    expect(miniPositions(3, 5, 12)).toEqual({ done: 0.25, now: 1 / 3 });
    expect(miniPositions(20, 0, 12)).toEqual({ done: 1, now: 0 });
    expect(timeBarWidths([180, 90, 45])).toEqual([1, 0.5, 0.25]);
    expect(timeBarWidths([0, 0])).toEqual([0, 0]);
  });

  it("uses the historical plan for past stops and the current plan for the window", () => {
    const stops = buildStops({
      now, availability, examDate: "2026-11-12",
      assessments: [{ id: "assignment", title: "Coursework", dueDate: "2026-10-10", weight: 20, kind: "assignment" }],
      plans: [
        { version: 1, simNow: new Date("2026-10-05T09:00:00+01:00"), isCurrent: false, status: "cut", unscheduledCount: 0,
          sessions: [{ id: "old", date: "2026-10-07", minutes: 30, pieces: [{ topicId: "a" }], status: "done", checkedAt: new Date("2026-10-07T20:00:00+01:00") }] },
        { version: 2, simNow: now, isCurrent: true, status: "cut", unscheduledCount: 0,
          sessions: [{ id: "today", date: "2026-10-08", minutes: 40, pieces: [{ topicId: "b" }], status: "pending" }, { id: "later", date: "2026-10-15", minutes: 20, pieces: [], status: "pending" }] },
      ],
    });
    expect(stops[0]).toMatchObject({ kind: "session", id: "old", state: "done", editable: false });
    expect(stops.find((stop) => stop.kind === "session" && stop.id === "today")).toMatchObject({ state: "tonight", editable: true });
    expect(stops.find((stop) => stop.kind === "due")).toMatchObject({ date: "2026-10-10", title: "Coursework" });
    expect(stops.find((stop) => stop.kind === "gap")).toMatchObject({ count: 1 });
    expect(stops.at(-1)).toEqual({ kind: "exam", date: "2026-11-12" });
  });

  it("counts sessions on either side of a later deadline and shows an infeasible tail", () => {
    const stops = buildStops({ now, availability, examDate: "2026-11-12",
      assessments: [{ id: "quiz", title: "Quiz", dueDate: "2026-10-20", weight: 10, kind: "quiz" }],
      plans: [{ version: 1, simNow: now, isCurrent: true, status: "infeasible", unscheduledCount: 3, sessions: [
        { id: "a", date: "2026-10-16", minutes: 20, pieces: [], status: "pending" },
        { id: "b", date: "2026-10-21", minutes: 20, pieces: [], status: "pending" },
      ] }],
    });
    expect(stops.filter((stop) => stop.kind === "gap")).toEqual([{ kind: "gap", count: 1 }, { kind: "gap", count: 1 }]);
    expect(stops.at(-2)).toEqual({ kind: "wont", date: "2026-10-20", count: 3 });
  });
});
