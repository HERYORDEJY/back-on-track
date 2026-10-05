import { describe, expect, it } from "vitest";
import { getCourseSeed, READING_SOURCE } from "../prisma/course";
import { getPersonaSeed } from "../prisma/personas";
import { formatDate } from "../lib/i18n";

const calendarDate = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

describe("sample course contract", () => {
  it("has 36 unique ordered topics, three per week for all 12 weeks", () => {
    const { topics } = getCourseSeed();
    expect(topics).toHaveLength(36);
    expect(new Set(topics.map(({ id }) => id)).size).toBe(36);
    expect(topics.map(({ order }) => order)).toEqual(Array.from({ length: 36 }, (_, index) => index + 1));
    for (let week = 1; week <= 12; week++) expect(topics.filter((topic) => topic.week === week)).toHaveLength(3);
  });

  it("retains the selected attribution/licence and a distinct direct source for every topic", () => {
    const { course, topics } = getCourseSeed();
    expect(course.sourceTitle).toContain("University of Minnesota");
    expect(course.sourceLicense).toContain("CC BY-NC-SA 4.0");
    expect(READING_SOURCE.attribution).toContain("simulated");
    expect(new Set(topics.map(({ sourceRefs }) => sourceRefs[0].url)).size).toBe(36);
    for (const topic of topics) {
      expect(topic.title.length).toBeGreaterThan(0);
      expect(topic.courseId).toBe(course.id);
      expect(topic.sourceRefs).toHaveLength(1);
      expect(topic.sourceRefs[0].section).toMatch(/^\d+\.\d+$/);
      expect(topic.sourceRefs[0].url).toMatch(/^https:\/\/pressbooks\.bccampus\.ca\/principlesofmanagement2021\/chapter\/[^/]+\/$/);
    }
  });

  it("keeps estimates and normalized weights within the agreed simulated ranges", () => {
    const { topics } = getCourseSeed();
    for (const topic of topics) {
      expect(topic.estMinutes).toBeGreaterThanOrEqual(60);
      expect(topic.estMinutes).toBeLessThanOrEqual(100);
      expect(topic.examWeight).toBeGreaterThanOrEqual(0.01);
      expect(topic.examWeight).toBeLessThanOrEqual(0.06);
    }
    expect(topics.reduce((sum, topic) => sum + topic.estMinutes, 0) / topics.length).toBe(80);
    expect(topics.reduce((sum, topic) => sum + topic.examWeight, 0)).toBeCloseTo(1, 12);
  });

  it("has nine prerequisite parents and no dangling, duplicate, self or cyclic links", () => {
    const { topics } = getCourseSeed();
    const byId = new Map(topics.map((topic) => [topic.id, topic]));
    const parents = new Set(topics.flatMap(({ prereqIds }) => prereqIds));
    expect(parents.size).toBe(9);
    for (const topic of topics) {
      expect(new Set(topic.prereqIds).size).toBe(topic.prereqIds.length);
      for (const id of topic.prereqIds) {
        const parent = byId.get(id);
        expect(parent, `Missing prerequisite ${id}`).toBeDefined();
        expect(parent!.order).toBeLessThan(topic.order);
      }
    }
  });

  it("preserves assessment coverage, dates and total weight", () => {
    const { course, topics, assessments } = getCourseSeed();
    expect(calendarDate(course.startDate)).toBe("2026-09-07");
    expect(calendarDate(course.examDate)).toBe("2026-12-01");
    expect(assessments.map((assessment) => [assessment.id, calendarDate(assessment.dueDate), assessment.weight, assessment.topicIds.length])).toEqual([
      ["a1", "2026-10-04", 0.15, 12], ["a2", "2026-11-01", 0.15, 12],
      ["a3", "2026-11-22", 0.20, 9], ["exam", "2026-12-01", 0.50, 36],
    ]);
    expect(assessments.reduce((sum, assessment) => sum + assessment.weight, 0)).toBe(1);
    expect(assessments.at(-1)!.topicIds).toEqual(topics.map(({ id }) => id));
    expect(assessments.slice(0, 3).flatMap(({ topicIds }) => topicIds)).toEqual(topics.slice(0, 33).map(({ id }) => id));
  });

  it("returns independent deterministic objects for seed/reset callers", () => {
    const original = getCourseSeed();
    const changed = getCourseSeed();
    changed.course.startDate.setFullYear(2030);
    changed.topics[0].title = "Changed";
    changed.topics[1].prereqIds.push("unknown");
    changed.topics[0].sourceRefs[0].url = "Changed";
    changed.assessments[0].topicIds.pop();
    expect(getCourseSeed()).toEqual(original);
  });
});

describe("approved persona academic records", () => {
  it("preserves identity, language, hours and privacy limits", () => {
    const { students } = getPersonaSeed();
    expect(students.map(({ id, name, language, availability }) => [id, name, language, availability])).toEqual([
      ["amaka", "Amaka Okafor", "pcm", { mon: 40, tue: 40, wed: 40, thu: 40, fri: 40, sat: 0, sun: 90 }],
      ["tunde", "Tunde Adeyemi", "en", { mon: 20, tue: 20, wed: 20, thu: 20, fri: 20, sat: 20, sun: 20 }],
      ["zainab", "Zainab Bello", "en", { mon: 60, tue: 60, wed: 60, thu: 60, fri: 60, sat: 60, sun: 60 }],
    ]);
    for (const student of students) {
      expect(student.isSimulated).toBe(true);
      expect(student.segment).toBeNull();
      expect(student.escalatedAt).toBeNull();
      expect(student.hoursVary).toBe(false);
      expect(student.goal.length).toBeLessThanOrEqual(80);
      expect(student.context.length).toBeLessThanOrEqual(120);
    }
  });

  it.each([["amaka", 3, "2026-09-27"], ["tunde", 1, "2026-09-13"], ["zainab", 5, "2026-10-17"]] as const)("dates %s's completed weeks before last activity", (id, weeks, lastSeen) => {
    const { students, progress } = getPersonaSeed();
    const { topics, course } = getCourseSeed();
    const student = students.find((student) => student.id === id)!;
    const done = progress.filter((row) => row.studentId === id);
    expect(calendarDate(student.lastSeenAt)).toBe(lastSeen);
    expect(student.lastSeenAt.toISOString().slice(11)).toBe("20:00:00.000Z");
    expect(done.map(({ topicId }) => topicId)).toEqual(topics.filter(({ week }) => week <= weeks).map(({ id }) => id));
    for (const row of done) {
      const topic = topics.find(({ id }) => id === row.topicId)!;
      const days = Math.floor((row.completedAt.getTime() - course.startDate.getTime()) / 86_400_000);
      expect(Math.floor(days / 7) + 1).toBe(topic.week);
      expect(row.completedAt.getTime()).toBeLessThanOrEqual(student.lastSeenAt.getTime());
      expect(row.completedAt.toISOString().slice(11)).toBe("20:00:00.000Z");
      expect(row.sessionId).toBeNull();
    }
  });

  it("represents missed coursework by absence and Zainab's timely submission by a dated row", () => {
    const { submissions } = getPersonaSeed();
    expect(submissions).toHaveLength(1);
    expect(submissions[0]).toMatchObject({ studentId: "zainab", assessmentId: "a1" });
    expect(calendarDate(submissions[0].submittedAt)).toBe("2026-10-02");
    expect(formatDate(submissions[0].submittedAt, "en")).toContain("2");
  });

  it("produces stable unique ids and independent mutable values", () => {
    const original = getPersonaSeed();
    const allIds = [...original.students, ...original.progress, ...original.submissions].map(({ id }) => id);
    expect(new Set(allIds).size).toBe(allIds.length);
    const changed = getPersonaSeed();
    changed.students[0].availability.mon = 0;
    changed.students[0].lastSeenAt.setFullYear(2030);
    changed.progress[0].completedAt.setFullYear(2030);
    changed.submissions[0].submittedAt.setFullYear(2030);
    expect(getPersonaSeed()).toEqual(original);
  });
});
