import { z } from "zod";
import { getDb } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { Prisma } from "@/lib/generated/prisma/client";

const availabilitySchema = z.strictObject({
  mon: z.number().int().min(0).max(1440),
  tue: z.number().int().min(0).max(1440),
  wed: z.number().int().min(0).max(1440),
  thu: z.number().int().min(0).max(1440),
  fri: z.number().int().min(0).max(1440),
  sat: z.number().int().min(0).max(1440),
  sun: z.number().int().min(0).max(1440),
}).refine((hours) => Math.max(...Object.values(hours)) >= 20);

export const studentPatchSchema = z.strictObject({
  language: z.enum(["en", "pcm"]).optional(),
  goal: z.string().max(80).nullable().optional(),
  context: z.string().max(120).nullable().optional(),
  availability: availabilitySchema.nullable().optional(),
  hoursVary: z.boolean().optional(),
}).refine((patch) => Object.values(patch).some((value) => value !== undefined));

export type StudentPatch = z.infer<typeof studentPatchSchema>;

export class StudentServiceError extends Error {
  constructor(public readonly code: "STUDENT_NOT_FOUND") { super(code); }
}

export async function getStudentLanguage(id: string) {
  const student = await getDb().student.findUnique({ where: { id }, select: { language: true } });
  return student?.language ?? null;
}

export async function updateStudent(id: string, patch: StudentPatch) {
  const now = await getNow();
  const db = getDb();
  return db.$transaction(async (tx) => {
    const student = await tx.student.findUnique({ where: { id }, select: {
      id: true, language: true, goal: true, context: true, availability: true, hoursVary: true,
    } });
    if (!student) throw new StudentServiceError("STUDENT_NOT_FOUND");

    const goal = patch.goal === undefined ? student.goal : patch.goal?.trim() || null;
    const context = patch.context === undefined ? student.context : patch.context?.trim() || null;
    const nextAvailability = patch.availability === undefined ? student.availability : patch.availability;
    const hoursVary = patch.hoursVary ?? student.hoursVary;
    const changed = goal !== student.goal || context !== student.context ||
      JSON.stringify(nextAvailability) !== JSON.stringify(student.availability) || hoursVary !== student.hoursVary;
    const data: Prisma.StudentUpdateInput = {
      language: patch.language ?? student.language,
      goal, context, hoursVary, lastSeenAt: now,
    };
    if (patch.availability !== undefined) data.availability = patch.availability ?? Prisma.DbNull;
    await tx.student.update({ where: { id }, data });
    if (changed) await tx.plan.updateMany({ where: { studentId: id, isCurrent: true }, data: { isCurrent: false } });
    return { id, language: patch.language ?? student.language, planNeedsRefresh: changed };
  }, { timeout: 30_000 });
}
