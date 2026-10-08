import { defineConfig } from "@playwright/test";
import "dotenv/config";
import { e2eDatabaseUrl } from "./scripts/e2e-database";

const baseURL = "http://127.0.0.1:3100";
const databaseUrl = e2eDatabaseUrl(process.env.E2E_DATABASE_URL, process.env.DATABASE_URL);

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  use: { baseURL, browserName: "chromium" },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3100",
    url: baseURL,
    env: { DATABASE_URL: databaseUrl, DEMO_MODE: "true" },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
