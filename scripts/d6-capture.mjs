import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";

const phase = process.argv[2];
if (!["before", "review", "review-pcm", "after"].includes(phase)) {
  throw new Error("Usage: node scripts/d6-capture.mjs before|review|review-pcm|after");
}

const baseURL = "http://127.0.0.1:3100";
const output = resolve("docs/design", phase);
const learnerReview = phase === "review" || phase === "review-pcm";
const reviewPcm = phase === "review-pcm";
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
      await page.evaluate(() => { history.scrollRestoration = "manual"; document.documentElement.scrollTop = 0; document.body.scrollTop = 0; scrollTo(0, 0); });
      await page.waitForTimeout(300);
      await page.evaluate(() => { document.documentElement.scrollTop = 0; document.body.scrollTop = 0; scrollTo(0, 0); });
      await page.waitForFunction(() => window.scrollY === 0);
      await page.screenshot({ path: resolve(output, `${view}-${name}.png`), animations: "disabled" });
      console.log(`${view}-${name}.png`);
    };

    await page.goto(`${baseURL}/`);
    await expect(page.locator(".hero h1")).toBeVisible();
    if (reviewPcm) {
      await page.getByTestId("language-switch").locator('[data-language="pcm"]').click();
      await expect(page.getByTestId("language-switch").locator('[data-language="pcm"]')).toHaveAttribute("aria-pressed", "true");
    }
    await capture("landing");

    await page.goto(`${baseURL}/learner/amaka`);
    await expect(page.getByTestId("build-plan")).toBeVisible();
    if (phase === "review") {
      await page.getByTestId("language-switch").locator('[data-language="en"]').click();
      await expect(page.getByTestId("language-switch").locator('[data-language="en"]')).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("heading", { name: "Let's get you back on track." })).toBeVisible();
    }
    await capture("intake");
    await page.getByTestId("build-plan").click();
    await expect(page.getByTestId("plan-status")).toHaveAttribute("data-status", "cut");
    await page.reload();
    await expect(page.getByTestId("plan-status")).toHaveAttribute("data-status", "cut");
    await capture("amaka-plan");

    await page.goto(`${baseURL}/learner/tunde`);
    if (reviewPcm) {
      await page.getByTestId("language-switch").locator('[data-language="pcm"]').click();
      await expect(page.getByTestId("language-switch").locator('[data-language="pcm"]')).toHaveAttribute("aria-pressed", "true");
    }
    await page.getByTestId("build-plan").click();
    await expect(page.getByTestId("infeasible-message")).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("infeasible-message")).toBeVisible();
    await capture("tunde-cant-catch-up");

    if (learnerReview) { await context.close(); continue; }

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
