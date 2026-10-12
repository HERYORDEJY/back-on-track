import { chromium, expect } from "@playwright/test";

const base = "http://127.0.0.1:3100";
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion: "reduce" });
const page = await context.newPage();
const failures = [];
const requests = new Set();
page.on("request", (request) => {
  if (/\.(?:woff2?|ttf|otf|png|jpe?g|gif|webp|svg)(?:\?|$)/i.test(request.url())) requests.add(new URL(request.url()).pathname);
});

async function inspect(name) {
  await page.keyboard.press("Tab");
  const result = await page.evaluate(() => {
    const small = [...document.querySelectorAll("a[href], button, input, select, textarea, summary")].flatMap((element) => {
      if (element.closest('[aria-hidden="true"], .sr-only') || element instanceof HTMLInputElement && element.type === "hidden") return [];
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (!element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) || style.display === "none" || style.visibility === "hidden" || style.opacity === "0" || rect.width === 0 || rect.height === 0) return [];
      if (rect.width >= 44 && rect.height >= 44) return [];
      return [{ label: element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 50) ?? element.tagName, width: Math.round(rect.width), height: Math.round(rect.height) }];
    });
    const animated = [...document.querySelectorAll("*")].filter((element) => {
      const style = getComputedStyle(element);
      return style.animationName !== "none" && style.animationDuration !== "0s" || style.transitionDuration !== "0s" && style.transitionProperty !== "none";
    }).length;
    const noFocusRing = [...document.querySelectorAll("a[href], button, input, select, textarea, summary")].flatMap((element) => {
      if (element.closest('[aria-hidden="true"], .sr-only') || element instanceof HTMLInputElement && element.type === "hidden" || element.matches(":disabled")) return [];
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (!element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) || style.display === "none" || style.visibility === "hidden" || rect.width === 0 || rect.height === 0) return [];
      element.focus();
      if (document.activeElement !== element) return [];
      const focused = getComputedStyle(element);
      return focused.outlineStyle === "none" || parseFloat(focused.outlineWidth) < 3
        ? [element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 50) ?? element.tagName] : [];
    });
    return { small, noFocusRing, animated, overflow: document.documentElement.scrollWidth > innerWidth };
  });
  console.log(name, JSON.stringify(result));
  if (result.small.length || result.noFocusRing.length || result.animated || result.overflow) failures.push({ name, ...result });
}

try {
  const reset = await context.request.post(`${base}/api/demo/reset`);
  if (!reset.ok()) throw new Error(`Reset failed: ${reset.status()}`);
  await page.goto(base);
  await expect(page.getByTestId("start-demo")).toBeVisible();
  await inspect("landing");
  await page.goto(`${base}/learner/amaka`);
  await expect(page.getByTestId("build-plan")).toBeVisible();
  await inspect("intake");
  await page.getByTestId("build-plan").click();
  await expect(page.getByTestId("plan-status")).toBeVisible();
  await inspect("plan");
  await page.goto(`${base}/learner/tunde`);
  await page.getByTestId("build-plan").click();
  await expect(page.getByTestId("infeasible-message")).toBeVisible();
  await inspect("can't catch up");
  await page.goto(`${base}/advisor`);
  await expect(page.getByTestId("advisor-row")).toBeVisible();
  await inspect("advisor list");
  await page.getByTestId("advisor-row").getByRole("link").click();
  await expect(page.getByRole("dialog", { name: /Call notes for/ })).toBeVisible();
  await inspect("advisor details");
  console.log("visual asset requests", JSON.stringify([...requests]));
  if ([...requests].some((path) => !path.endsWith("/icon.svg"))) failures.push({ requests: [...requests] });
  if (failures.length) process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
