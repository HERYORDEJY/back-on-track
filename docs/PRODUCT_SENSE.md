# Product sense

Read this when a decision isn't covered by a spec: copy, empty states, edge cases, what to cut. It says who Back on Track is for and what "good" means.

## The capstone

- Programme: Andela x OpenAI Codex Accelerator, capstone in partnership with MIVA Open University.
- Theme: "Learning That Stays With You".
- Track: Engagement & Staying in the Learning Journey.
- [The supplied brief](../CAPSTONE_PROJECT_BRIEF.md) asks for a working proof of concept built with AI software development tools that helps people engage with learning in a sustained, useful way connected to opportunity. It is an invention sprint, not a product launch; it says not to use AI to generate the capstone idea. Back on Track is the maintainer's submitted idea; implementation work follows it.
- Final goal: a 3-minute live demo that wins the showcase, then a pilot conversation with MIVA.
- No official judging rubric is known. The maintainer wants originality and ingenuity within the brief. Build begins 2026-10-04 as availability allows; about two weeks to submission is an estimate, not a confirmed date (`PLANS.md`).

## The problem

Many students at open universities like MIVA fit their studies around full-time jobs, businesses and children. One hard month and they're 3 weeks behind. Catching up starts to look impossible, and that's when students quietly drop out.

MIVA [reported reaching 20,000 students in December 2025](https://miva.edu.ng/celebrating-20000-students-at-miva-open-university/), and its [Chancellor announced an ambition of 100,000 by 2027](https://miva.edu.ng/the-chancellors-speech-at-the-miva-matriculation/). These are university-reported figures, not an independently verified current count. Advisor overload and late detection are problem hypotheses for a partner interview; no staffing-capacity or dropout evidence has been obtained. Published evidence and its limits are in [RESEARCH.md](RESEARCH.md).

## Who it's for

| User | What they need from us |
| --- | --- |
| A student who has fallen behind | A plan that fits the hours they really have, tonight's step first, honest news when catching up isn't possible, in their language, on a basic phone with patchy data |
| An advisor | Who needs a call this week and why, with an editable message ready to copy; sending remains outside this app |

## What good looks like

- A student knows what to do tonight within 10 seconds of opening the plan.
- Every cut comes with a reason and the course fact behind it.
- Bad news arrives early, plainly and with a next step.
- Nothing asks for information we don't use. Optional means optional.
- An advisor can act on the top of the list without opening anything else.

## Principles for judgment calls

1. Keep a struggling student in the course with the least effort from them.
2. Never shame. Missed sessions are normal; the plan adjusts without commenting on the past.
3. Show the reason. A decision without a visible reason is a bug.
4. Honest over hopeful. Never promise a catch-up the numbers don't support.
5. The student sees what the advisor sees.
6. A basic phone on a weak connection comes first.
7. When unsure, choose the simpler screen.

## Theme and constraints

Every requirement in the brief maps to something built and shown.

| Brief requirement | How Back on Track meets it | Spec |
| --- | --- | --- |
| Sustained | Catch-up plans and automatic re-plans keep a slipping student in the course | [engine](specs/engine.md) |
| Useful | Every plan fits the student's real hours, including shift work | [engine](specs/engine.md) |
| Connected to opportunity | The student's goal, such as a promotion or a new role, sits at the top of the plan | [frontend](FRONTEND.md) |
| Quality and credibility | Readings trace to credible public sources; code computes reasons and labels simulated course metadata | [engine](specs/engine.md), [research](RESEARCH.md) |
| Low bandwidth, basic devices | The plan works offline after first load, check-ins sync later, screens stay light | [frontend](FRONTEND.md) |
| Accessibility and inclusion | Plain language, read-aloud for the plan and infeasible screen, screen-reader labels elsewhere, large tap targets | [frontend](FRONTEND.md) |
| Personalization without exclusion | Irregular hours still get a plan; "can't make it" gets a study-break route and an advisor | [engine](specs/engine.md) |
| Privacy and security | Redacted AI inputs, limited free text, shared call-priority/reasons/activity/escalation, private advisor working notes, Delete my data retaining course records | [ai](specs/ai.md), [data](specs/data.md) |
| Multilingual | English and Nigerian Pidgin learner UI/plan text is the retained target; the current demo temporarily shows English only while Pidgin is reviewed. Published course/topic titles remain English | [frontend](FRONTEND.md), [ai](specs/ai.md) |
| Local relevance | A Nigerian open-university course structure, names and contexts | [data](specs/data.md) |

## In scope

- One approved 36-reading, 12-week demo adaptation of BCcampus / University of Minnesota Principles of Management, with 3 simulated coursework assessments and a final exam; reading attribution and simulated metadata are explicit.
- Three scripted personas and 300 simulated students in one cohort.
- A simulated clock the presenter can move forward.
- Learner flow: intake, plan, check-in, re-plan with a change summary, in-app reminders shown in the night block and session line, the infeasible screen.
- Offline plan view and queued check-ins; language edits and Pidgin display are temporarily paused. Read-aloud remains on the plan and infeasible screen.
- Privacy: a "What your advisor sees" panel with call-priority band, reasons, last activity and escalation; numeric scores stay internal, goal/context stay learner-only and outreach drafts stay advisor-only. Delete my data removes app-collected data while retaining university course Progress/Submission.
- Advisor view: risk-ranked list with reasons and drafted outreach in English during the pause.
- `DEMO_MODE` with cached AI responses and a deterministic fallback.

Everything else is under "Never build" in `AGENTS.md` or in the Later list in `PLANS.md`.

## Voice

- Warm, specific and guilt-free, like a calm senior colleague.
- Plain words and short sentences. Nigerian context, British spelling.
- Pidgin is everyday Nigerian Pidgin, the way people text, never exaggerated or comic.
- Never promise what an advisor can't deliver. Never mention AI to the student.

## The demo

The build targets this 90-second path. Golden rules outrank the cut list, and the cut list outranks this script; the maintainer explicitly paused Pidgin for the current English-only demo on 2026-10-13. Required privacy, offline and read-aloud work is not excluded just because it is off-script. Three personas share one cohort and one clock, starting on Monday of Week 7: Amaka needs cuts, Tunde cannot catch up before the exam, and Zainab fits without cuts (kept for Q&A). Who they are and their exact data: [data spec](specs/data.md). If the change summary or advisor screen is cut, update these steps and the local demo test in the same change (`PLANS.md`).

1. Start demo. Amaka taps "Get me back on track": her plan appears in English with her goal on top, tonight's session, and what's skipped and why. (25 seconds)
2. Turn on airplane mode and mark tonight's session done; it's saved on the phone and syncs when she's back online. Jump 3 days: her 2 missed sessions reshape the plan, with a change summary. (25 seconds)
3. Switch to Tunde. Catching up before the exam isn't possible: show what fits through the next assessment date, list what will not fit, and read the summary/next step aloud. His simulated advisor is flagged; he is prompted to ask about an extension or study break, with no promise of eligibility or approval. (20 seconds)
4. Open the advisor view: Tunde at the top with his reasons, a drafted message, and the adherence metric. (20 seconds)
