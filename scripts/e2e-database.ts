import { userInfo } from "node:os";

const defaultUrl = `postgresql://${encodeURIComponent(userInfo().username)}@127.0.0.1:5433/back_on_track_e2e`;
const loopbackHosts = ["127.0.0.1", "localhost", "[::1]"];

export function e2eDatabaseUrl(configured: string | undefined, appDatabaseUrl: string | undefined): string {
  const value = configured?.trim() || defaultUrl;
  let target: URL;
  try { target = new URL(value); }
  catch { throw new Error("E2E database URL is invalid"); }
  if (!["postgres:", "postgresql:"].includes(target.protocol) || !loopbackHosts.includes(target.hostname) || target.search || target.hash) {
    throw new Error("E2E database must use a direct loopback PostgreSQL URL");
  }
  if (target.pathname !== "/back_on_track_e2e") throw new Error("E2E database must be named back_on_track_e2e");
  if (appDatabaseUrl) {
    try {
      const app = new URL(appDatabaseUrl);
      if (loopbackHosts.includes(app.hostname) && (target.port || "5432") === (app.port || "5432") && target.pathname === app.pathname) {
        throw new Error("E2E database matches the app database");
      }
    } catch (error) {
      if (error instanceof Error && error.message === "E2E database matches the app database") throw error;
    }
  }
  return value;
}
