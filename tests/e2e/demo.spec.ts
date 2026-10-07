import { expect, test } from "@playwright/test";

test("the learner demo survives an offline visit and replays progress", async ({ page, context, request }) => {
  await page.goto("/");
  await page.getByTestId("start-demo").click();
  await page.getByTestId("build-plan").click();
  await expect(page.getByTestId("plan-status")).toHaveAttribute("data-status", "cut");
  await page.getByTestId("language-switch").selectOption("en");
  await expect(page.getByTestId("language-switch")).toHaveValue("en");
  await expect(page.getByTestId("plan-status")).toContainText("What to study");
  await expect(page.getByTestId("offline-note")).toContainText("ready to open");
  await expect.poll(() => page.evaluate(async () => {
    const response = await (await caches.open("back-on-track-learner-pages-v1")).match(location.href);
    return (await response?.text())?.includes("What to study") ?? false;
  })).toBeTruthy();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId("plan-status")).toHaveAttribute("data-status", "cut");
  await expect(page.getByTestId("offline-note")).toContainText("saved on this phone");
  await page.getByTestId("language-switch").selectOption("pcm");
  await expect(page.getByTestId("language-switch")).toHaveValue("pcm");
  await expect(page.getByTestId("plan-status")).toContainText("Wetin");
  await page.getByTestId("session-done").click();
  await expect(page.getByTestId("offline-note")).toContainText("this phone save");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("back-on-track:student:amaka:queue") ?? "[]").length)).toBe(2);

  const clock = await request.post("/api/clock", { data: { jumpDays: 3 } });
  expect(clock.ok()).toBeTruthy();
  await context.setOffline(false);
  await expect(page.getByTestId("offline-note")).toContainText("earlier study day wey don sync");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("back-on-track:student:amaka:queue") ?? "[]").length)).toBe(0);
  await expect(page.getByTestId("change-summary")).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();

  await page.getByRole("link", { name: "Tunde Adeyemi" }).click();
  await page.getByTestId("build-plan").click();
  await expect(page.getByTestId("infeasible-message")).toBeVisible();
  await page.goto("/advisor");
  await expect(page.getByTestId("advisor-row").first()).toContainText("Tunde");
  await expect(page.locator("main > ul > li")).toHaveCount(40);
  await page.getByRole("link", { name: "Next page" }).click();
  await expect(page).toHaveURL(/\/advisor\?page=2$/);
  await expect(page.getByText("Page 2 of 8")).toBeVisible();
  await page.getByTestId("advisor-row").getByRole("link").click();
  await expect(page).toHaveURL(/\/advisor\?page=2&student=/);
  await page.getByRole("link", { name: "Close details" }).click();
  await expect(page).toHaveURL(/\/advisor\?page=2$/);
  await page.getByRole("link", { name: "Previous page" }).click();
  await expect(page.getByTestId("advisor-row").first()).toContainText("Tunde");

  await page.goto("/learner/amaka");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("back-on-track:student:amaka:snapshot") !== null)).toBeTruthy();
  await page.locator(".delete-data button").first().click();
  await page.locator(".delete-data__actions button").last().click();
  await expect(page).toHaveURL(/\?deleted=1$/);
  expect(await page.evaluate(() => localStorage.getItem("back-on-track:student:amaka:snapshot"))).toBeNull();
  expect(await page.evaluate(async () => (await (await caches.open("back-on-track-learner-pages-v1")).keys()).some((request) => new URL(request.url).pathname === "/learner/amaka"))).toBeFalsy();
  await page.getByTestId("start-demo").click();
  await expect(page).toHaveURL(/\/learner\/amaka$/);
  await expect(page.getByTestId("build-plan")).toBeVisible();
});

test("Start demo keeps a device cleanup warning visible", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    Object.defineProperty(caches, "delete", { configurable: true, value: async () => { throw new Error("Storage unavailable"); } });
  });
  await page.getByTestId("start-demo").click();
  await expect(page.locator(".start-demo [role='alert']")).toContainText("saved copy");
  await expect(page.getByTestId("start-demo")).toBeEnabled();
  await expect(page).toHaveURL("/");
});
