import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";

const phase = process.argv[2];
if (phase !== "before" && phase !== "after") {
  throw new Error("Usage: node scripts/d6-capture.mjs before|after");
}

const baseURL = "http://127.0.0.1:3100";
const output = resolve("docs/D6-UI-Overhaul-Task-Documentation/design", phase);
await mkdir(output, { recursive: true });

const browser = await chromium.launch();
const request = await browser.newContext();
try {
  for (const viewport of [{ width: 375, height: 812 }, { width: 1280, height: 800 }]) {
    const reset = await request.request.post(`${baseURL}/api/demo/reset`);
    if (!reset.ok()) throw new Error(`Demo reset failed: ${reset.status()}`);
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const name = `${viewport.width}x${viewport.height}`;
    const capture = async (view) => {
      await page.screenshot({ path: resolve(output, `${view}-${name}.png`), animations: "disabled" });
      console.log(`${view}-${name}.png`);
    };

    await page.goto(`${baseURL}/`);
    await capture("landing");

    await page.goto(`${baseURL}/learner/amaka`);
    await expect(page.getByTestId("build-plan")).toBeVisible();
    await capture("intake");
    await page.getByTestId("build-plan").click();
    await expect(page.getByTestId("plan-status")).toHaveAttribute("data-status", "cut");
    await capture("amaka-plan");

    await page.goto(`${baseURL}/learner/tunde`);
    await page.getByTestId("build-plan").click();
    await expect(page.getByTestId("infeasible-message")).toBeVisible();
    await capture("tunde-cant-catch-up");

    await page.goto(`${baseURL}/advisor?student=tunde`);
    await expect(page.getByTestId("advisor-row").first()).toContainText("Tunde", { timeout: 20_000 });
    await expect(page.getByRole("dialog", { name: /Tunde Adeyemi/ })).toBeVisible({ timeout: 20_000 });
    await capture("advisor-tunde-open");
    await context.close();
  }
} finally {
  await request.close();
  await browser.close();
}
