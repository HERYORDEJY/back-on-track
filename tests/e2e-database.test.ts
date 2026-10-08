import { describe, expect, it } from "vitest";
import { userInfo } from "node:os";
import { e2eDatabaseUrl } from "../scripts/e2e-database";

const local = `postgresql://${encodeURIComponent(userInfo().username)}@127.0.0.1:5433/back_on_track_e2e`;

describe("local browser-test database guard", () => {
  it("defaults to a dedicated loopback database", () => {
    expect(e2eDatabaseUrl(undefined, "postgresql://example.com/prod")).toBe(local);
    expect(e2eDatabaseUrl("postgres://localhost:5433/back_on_track_e2e", undefined)).toBe("postgres://localhost:5433/back_on_track_e2e");
  });

  it("rejects a remote or differently named database without echoing credentials", () => {
    expect(() => e2eDatabaseUrl("postgresql://private:secret@db.example.com/back_on_track_e2e", undefined)).toThrow("loopback");
    expect(() => e2eDatabaseUrl("postgresql://127.0.0.1:5433/back_on_track", undefined)).toThrow("back_on_track_e2e");
    try { e2eDatabaseUrl("postgresql://private:secret@db.example.com/back_on_track_e2e", undefined); }
    catch (error) { expect(String(error)).not.toMatch(/private|secret/); }
  });

  it("rejects the app database even when it is local", () => {
    expect(() => e2eDatabaseUrl(local, local)).toThrow("app database");
    expect(() => e2eDatabaseUrl(local, "postgresql://localhost:5433/back_on_track_e2e")).toThrow("app database");
  });
});
