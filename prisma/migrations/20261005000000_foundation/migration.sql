-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('en', 'pcm');

-- CreateEnum
CREATE TYPE "Segment" AS ENUM ('on_track', 'drifting', 'recovering', 'gone_quiet');

-- CreateEnum
CREATE TYPE "AssessmentKind" AS ENUM ('assignment', 'quiz', 'exam');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('fit', 'cut', 'infeasible');

-- CreateEnum
CREATE TYPE "PlanSource" AS ENUM ('ai', 'fallback', 'cache');

-- CreateEnum
CREATE TYPE "Action" AS ENUM ('keep', 'compress_light', 'compress_heavy', 'skip');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('pending', 'done', 'missed');

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMPTZ(3) NOT NULL,
    "examDate" TIMESTAMPTZ(3) NOT NULL,
    "sourceTitle" TEXT,
    "sourceUrl" TEXT,
    "sourceLicense" TEXT,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "estMinutes" INTEGER NOT NULL,
    "examWeight" DOUBLE PRECISION NOT NULL,
    "prereqIds" TEXT[],
    "sourceRefs" JSONB NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "AssessmentKind" NOT NULL,
    "dueDate" TIMESTAMPTZ(3) NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "topicIds" TEXT[],

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "context" VARCHAR(120),
    "goal" VARCHAR(80),
    "language" "Language" NOT NULL,
    "isSimulated" BOOLEAN NOT NULL,
    "segment" "Segment",
    "availability" JSONB,
    "hoursVary" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMPTZ(3),
    "escalatedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Progress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "completedAt" TIMESTAMPTZ(3) NOT NULL,
    "sessionId" TEXT,

    CONSTRAINT "Progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "submittedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isCurrent" BOOLEAN NOT NULL,
    "simNow" TIMESTAMPTZ(3) NOT NULL,
    "status" "PlanStatus" NOT NULL,
    "source" "PlanSource" NOT NULL,
    "requiredMin" INTEGER NOT NULL,
    "capacityMin" INTEGER NOT NULL,
    "summary" JSONB NOT NULL,
    "changeSummary" JSONB,
    "warnings" JSONB NOT NULL,
    "focusAssessmentId" TEXT,
    "focusDueDate" TIMESTAMPTZ(3),
    "unscheduled" JSONB NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "action" "Action" NOT NULL,
    "minutes" INTEGER NOT NULL,
    "basis" JSONB NOT NULL,
    "rationale" JSONB NOT NULL,

    CONSTRAINT "PlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "minutes" INTEGER NOT NULL,
    "pieces" JSONB NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'pending',
    "checkedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL,
    "text" JSONB NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outreach" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "nextStep" TEXT NOT NULL,
    "contacted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Outreach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCache" (
    "key" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCache_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Topic_courseId_order_key" ON "Topic"("courseId", "order");

-- CreateIndex
CREATE INDEX "Assessment_courseId_dueDate_idx" ON "Assessment"("courseId", "dueDate");

-- CreateIndex
CREATE INDEX "Progress_sessionId_idx" ON "Progress"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Progress_studentId_topicId_key" ON "Progress"("studentId", "topicId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_studentId_assessmentId_key" ON "Submission"("studentId", "assessmentId");

-- CreateIndex
CREATE INDEX "Plan_studentId_isCurrent_idx" ON "Plan"("studentId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_studentId_version_key" ON "Plan"("studentId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PlanItem_planId_topicId_key" ON "PlanItem"("planId", "topicId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_planId_date_key" ON "Session"("planId", "date");

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_focusAssessmentId_fkey" FOREIGN KEY ("focusAssessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanItem" ADD CONSTRAINT "PlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanItem" ADD CONSTRAINT "PlanItem_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outreach" ADD CONSTRAINT "Outreach_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Start the simulated clock; course/persona/cohort seeding is a separate task.
INSERT INTO "Setting" ("key", "value") VALUES ('clock', '2026-10-19T17:00:00.000Z');
