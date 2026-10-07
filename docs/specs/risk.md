# Risk spec (`lib/risk`)

Ranks students for the advisor view. Pure: `now` is passed in and thresholds live in `config.ts`. Computed on every read and never stored, so it always matches the simulated clock. May import `lib/engine` (time rules, capacity) and `lib/i18n`.

## Signals

All rules are evaluated as of now (time rules in `specs/data.md`).

| Signal | Code | Rule | Points |
| --- | --- | --- | --- |
| Inactivity | `INACTIVE` | Days since last activity: 4-7 / 8-14 / 15 or more | 15 / 30 / 45 |
| Backlog pressure | `BACKLOG_PRESSURE` | Backlog minutes divided by capacity from today through the next deadline's due date: 0.5 to 1 / over 1 | 15 / 30 |
| Missed assessments | `MISSED_ASSESSMENT` | Due date before today and no submission | 10 each, max 20 |
| Missed sessions | `MISSED_SESSIONS` | The 3 or more most recent current-plan sessions before today are all effectively missed | 10 |
| Falling study time | `FALLING_STUDY_TIME` | `estMinutes` of topics done in the last 14 days is under half of the 14 days before, when that was above 0 | 10 |

- Last activity is the latest of `lastSeenAt`, `completedAt`, `submittedAt` and session `checkedAt` at or before now. No activity at all scores 45 inactivity points with `NO_ACTIVITY`, "No activity recorded yet", instead of inventing a day count or adding a second inactivity signal.
- The next deadline is the earliest assessment of any kind due on or after today.
- With an upcoming deadline and work outstanding, zero capacity scores 30 backlog-pressure points with `NO_STUDY_TIME`, "No study time left before {assessment}". With nothing outstanding it scores 0. No division by zero or infinite ratio is shown. If no deadline remains, omit backlog pressure entirely.
- Missed sessions only applies to students with a current plan.
- Score is the total, capped at 100. Bands: `high` 60 or more, `medium` 30-59, `low` under 30.
- Numeric score stays internal for sorting. Both learner and advisor see the band as "priority for a call", reasons, last activity and escalation; neither screen displays the numeric score. Goal/context are not advisor fields. Outreach is private advisor working text.

## Reasons (`reasons.ts`)

Each signal that scores returns `{ code, points, params }`. Text comes from the message keys `risk.reason.<CODE>` in both languages. The advisor screen shows reasons in English; the learner's "What your advisor sees" panel shows the same reasons in the learner's language.

| Code | Points | English template |
| --- | --- | --- |
| `ESCALATED` | 0, shown first | Their plan says catching up before the exam isn't possible |
| `INACTIVE` | as above | No activity for {days} days |
| `NO_ACTIVITY` | 45 inactivity points, replacing `INACTIVE` | No activity recorded yet |
| `BACKLOG_PRESSURE` | as above | Missed work is {ratio}x the time left before {assessment} |
| `NO_STUDY_TIME` | 30 backlog-pressure points, replacing `BACKLOG_PRESSURE` | No study time left before {assessment} |
| `MISSED_ASSESSMENT` | as above | Assessments missed: {count} |
| `MISSED_SESSIONS` | as above | Missed the last {count} planned sessions |
| `FALLING_STUDY_TIME` | as above | Study time fell from {before} min to {after} min over two weeks |

A student is escalated when `escalatedAt` is at or before now. A later fit or cut plan clears escalation so priority and copy reflect the new plan.

## Sorting

Escalated students first, then score from high to low, then the oldest last activity first.

## Header metric (`metric.ts`)

Labelled simulated. Of the students whose current plan is more than 14 days old, the share who marked at least 70% of their sessions from the last 14 days as done. Show both numbers: "{kept} of {total} students on a catch-up plan kept 70% or more of their sessions in the last 14 days".

Exclude plans with no sessions in that 14-day window from both numbers. If nobody qualifies, show "Not enough data yet" rather than a misleading zero percentage.

## Tests (`tests/risk/`)

- Boundary tests for every threshold: 3 and 4 days, 7 and 8, 14 and 15; ratios at 0.5 and 1; the 20-point cap on missed assessments; 2 against 3 missed sessions; the half rule for study time.
- Events dated after now are ignored.
- Zero capacity with/without outstanding work, no upcoming deadline, never-active reason without double scoring, excluded zero-session plans, empty metric copy, and escalation clearing after a feasible plan.
- Sort order with escalation and ties.
- With the cohort generated in memory at the demo start, most `on_track` students score low and most `gone_quiet` students score high. After jumping to Week 10, most `on_track` students still score low.

D4 verification (2026-10-07): 23 pure risk tests cover these boundaries and the generated 300-person cohort. The live local advisor list loaded 303 students; every High row had at least two reasons. After Tunde's infeasible plan he sorted first. At Week 10, all 180 live `on_track` rows were Low, and the simulated adherence metric read 23 of 31. The service keeps numeric scores inside its ranking path and projects the same public facts to the learner and advisor screens.
