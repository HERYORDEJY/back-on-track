import type { Prisma } from "../lib/generated/prisma/client";

export const READING_SOURCE = {
  title: "Principles of Management — University of Minnesota Libraries Publishing edition, 2015 (BCcampus host)",
  url: "https://pressbooks.bccampus.ca/principlesofmanagement2021/",
  license: "CC BY-NC-SA 4.0, except where otherwise noted",
  licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  attribution: "Principles of Management, © 2015 University of Minnesota, University of Minnesota Libraries Publishing edition, hosted by BCcampus. Original authors/publisher omitted at their request. Back on Track selects 36 readings and adds simulated weeks, estimates, weights, prerequisites and assessments; it does not reproduce textbook bodies or images.",
} as const;

// Selected published titles/URLs; all scheduling metadata below is simulated.
// Exact mapping and source-verification limits: docs/plans/d1-course-mapping.md.
const readings = [
  ["1.3", "Who Are Managers?", "1-3-who-are-managers"],
  ["1.4", "Leadership, Entrepreneurship, and Strategy", "1-4-leadership-entrepreneurship-and-strategy"],
  ["1.5", "Planning, Organizing, Leading, and Controlling", "1-5-planning-organizing-leading-and-controlling-2"],
  ["2.3", "Personality and Values", "2-3-personality-and-values-3"],
  ["2.4", "Perception", "2-4-perception"],
  ["2.5", "Work Attitudes", "2-5-work-attitudes"],
  ["3.3", "Ancient History: Management Through the 1990s", "3-3-ancient-history-management-through-the-1990s"],
  ["3.4", "Contemporary Principles of Management", "3-4-contemporary-principles-of-management"],
  ["3.6", "Globalization and Principles of Management", "3-6-globalization-and-principles-of-management"],
  ["4.3", "The Roles of Mission, Vision, and Values", "4-3-the-roles-of-mission-vision-and-values"],
  ["4.4", "Mission and Vision in the P-O-L-C Framework", "4-4-mission-and-vision-in-the-p-o-l-c-framework-2"],
  ["4.6", "Stakeholders", "4-6-stakeholders"],
  ["5.3", "Strategic Management in the P-O-L-C Framework", "5-3-strategic-management-in-the-p-o-l-c-framework"],
  ["5.6", "Developing Strategy Through Internal Analysis", "5-6-developing-strategy-through-internal-analysis"],
  ["5.7", "Developing Strategy Through External Analysis", "5-7-developing-strategy-through-external-analysis"],
  ["6.3", "The Nature of Goals and Objectives", "6-3-the-nature-of-goals-and-objectives"],
  ["6.4", "From Management by Objectives to the Balanced Scorecard", "6-4-from-management-by-objectives-to-the-balanced-scorecard"],
  ["6.5", "Characteristics of Effective Goals and Objectives", "6-5-characteristics-of-effective-goals-and-objectives"],
  ["7.3", "Organizational Structure", "7-3-organizational-structure"],
  ["7.5", "Organizational Change", "7-5-organizational-change"],
  ["8.3", "Understanding Organizational Culture", "8-3-understanding-organizational-culture"],
  ["8.5", "Creating and Maintaining Organizational Culture", "8-5-creating-and-maintaining-organizational-culture-2"],
  ["9.4", "How Managers Can Use Social Networks to Create Value", "9-4-how-managers-can-use-social-networks-to-create-value"],
  ["9.6", "Personal, Operational, and Strategic Networks", "9-6-personal-operational-and-strategic-networks"],
  ["10.3", "Who Is a Leader? Trait Approaches to Leadership", "10-3-who-is-a-leader-trait-approaches-to-leadership"],
  ["10.4", "What Do Leaders Do? Behavioral Approaches to Leadership", "10-4-what-do-leaders-do-behavioral-approaches-to-leadership"],
  ["10.6", "Contemporary Approaches to Leadership", "10-6-contemporary-approaches-to-leadership"],
  ["11.3", "Understanding Decision Making", "11-3-understanding-decision-making"],
  ["11.5", "Decision Making in Groups", "11-5-decision-making-in-groups"],
  ["12.3", "Understanding Communication", "12-3-understanding-communication"],
  ["12.5", "Different Types of Communication", "12-5-different-types-of-communication"],
  ["13.3", "Group Dynamics", "13-3-group-dynamics"],
  ["13.5", "Organizing Effective Teams", "13-5-organizing-effective-teams"],
  ["14.3", "Need-Based Theories of Motivation", "14-3-need-based-theories-of-motivation"],
  ["15.3", "Organizational Control", "15-3-organizational-control"],
  ["16.3", "The Changing Role of Strategic Human Resource Management in Principles of Management", "16-3-the-changing-role-of-strategic-human-resource-management-in-principles-of-management"],
] as const;

const prerequisites: Record<string, string[]> = {
  t02: ["t01"], t11: ["t03"], t13: ["t10"], t14: ["t13"], t15: ["t13"],
  t18: ["t16"], t20: ["t19"], t22: ["t21"], t27: ["t25"], t33: ["t32"],
};

/** Fresh deterministic values: callers cannot mutate later seed/reset runs. */
export function getCourseSeed() {
  const course = {
    id: "smpl201", code: "SMPL 201", title: "Principles of Management (sample course)",
    // Date-only academic boundaries represented at midnight Africa/Lagos.
    startDate: new Date("2026-09-07T00:00:00+01:00"),
    examDate: new Date("2026-12-01T00:00:00+01:00"),
    sourceTitle: READING_SOURCE.title, sourceUrl: READING_SOURCE.url, sourceLicense: READING_SOURCE.license,
  } satisfies Prisma.CourseCreateManyInput;
  const topics = readings.map(([section, title, slug], index) => {
    const order = index + 1;
    const id = `t${String(order).padStart(2, "0")}`;
    const week = Math.floor(index / 3) + 1;
    const slot = index % 3;
    return {
      id, courseId: course.id, week, order, title: String(title),
      estMinutes: [60, 80, 100][slot],
      examWeight: slot === 0 ? ([1, 3, 7, 10].includes(week) ? 0.02 : 0.01) : slot === 1 ? 0.03 : 0.04,
      prereqIds: [...(prerequisites[id] ?? [])],
      sourceRefs: [{ section, url: `${READING_SOURCE.url}chapter/${slug}/` }],
    } satisfies Prisma.TopicCreateManyInput;
  });
  const assessmentDefinitions = [
    ["a1", "Assignment 1", "assignment", "2026-10-04", 0.15, 1, 12],
    ["a2", "Assignment 2", "assignment", "2026-11-01", 0.15, 13, 24],
    ["a3", "Quiz", "quiz", "2026-11-22", 0.20, 25, 33],
    ["exam", "Final exam", "exam", "2026-12-01", 0.50, 1, 36],
  ] as const;
  const assessments = assessmentDefinitions.map(([id, title, kind, date, weight, first, last]) => ({
    id, courseId: course.id, title, kind, dueDate: new Date(`${date}T00:00:00+01:00`), weight,
    topicIds: topics.filter(({ order }) => order >= first && order <= last).map(({ id }) => id),
  } satisfies Prisma.AssessmentCreateManyInput));
  return { course, topics, assessments };
}
