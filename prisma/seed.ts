import dotenv from "dotenv";
import { getDb } from "../lib/db";
import { seedDatabase } from "./load-seed";

dotenv.config({ quiet: true });
const db = getDb();
try {
  const result = await seedDatabase(db);
  console.log(`Simulated seed loaded: ${result.students} students, ${result.topics} topics, ${result.recoveringPlans} fallback recovery plans. AiCache retained; demo clock restored.`);
} catch {
  console.error("Seed could not be confirmed. Database details omitted; an idempotent retry is safe.");
  process.exitCode = 1;
} finally { await db.$disconnect(); }
