import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForDb = globalThis as unknown as { backOnTrackDb?: PrismaClient };

export function getDb(): PrismaClient {
  if (!globalForDb.backOnTrackDb) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not configured");
    globalForDb.backOnTrackDb = new PrismaClient({
      adapter: new PrismaPg({ connectionString, connectionTimeoutMillis: 10_000 }),
    });
  }
  return globalForDb.backOnTrackDb;
}
