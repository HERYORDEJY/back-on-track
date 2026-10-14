import { expect, test } from "@playwright/test";

test("the learner demo survives an offline visit and replays progress", async ({ page, context, request }) => {
  await page.goto("/");
  await page.getByTestId("start-demo").click();
  await page.getByTestId("build-plan").click();
  await expect(page.getByTestId("plan-status")).toHaveAttribute("data-status", "cut");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByTestId("language-switch")).toHaveCount(0);
  await expect(page.getByTestId("plan-status")).toContainText("What's in your plan, and why");
  const onlineStops = await page.locator(".line .stop").count();
  const onlineBars = await page.locator(".time__row").count();
  expect(onlineStops).toBeGreaterThan(0);
  expect(onlineBars).toBe(3);
  await expect(page.getByTestId("offline-note")).toContainText("ready to open");
  expect(await page.evaluate(() => {
    const snapshot = JSON.parse(localStorage.getItem("back-on-track:student:amaka:snapshot") ?? "null");
    return snapshot?.version === 2 && snapshot.view.plan.stops.length > 0 && snapshot.view.plan.plannedMin > 0 && Object.keys(snapshot.view.plan.topicTitles).length > 0;
  })).toBeTruthy();
  await expect.poll(() => page.evaluate(async () => {
    const response = await (await caches.open("back-on-track-learner-pages-v2")).match(location.href);
    return (await response?.text())?.includes("Your week") ?? false;
  })).toBeTruthy();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId("plan-status")).toHaveAttribute("data-status", "cut");
  await expect(page.locator(".line .stop")).toHaveCount(onlineStops);
  await expect(page.locator(".time__row")).toHaveCount(onlineBars);
  await expect(page.getByTestId("offline-note")).toContainText("saved on this phone");
  await expect(page.getByTestId("plan-status")).toContainText("What's in your plan, and why");
  await expect(page.getByTestId("language-switch")).toHaveCount(0);
  await page.getByTestId("session-done").click();
  await expect(page.getByTestId("offline-note")).toContainText("saved on this phone");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("back-on-track:student:amaka:queue") ?? "[]").length)).toBe(1);

  const clock = await request.post("/api/clock", { data: { jumpDays: 3 } });
  expect(clock.ok()).toBeTruthy();
  await context.setOffline(false);
  await expect(page.getByTestId("offline-note")).toContainText("Check-ins synced after their study day");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("back-on-track:student:amaka:queue") ?? "[]").length)).toBe(0);
  await expect(page.getByTestId("change-summary")).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();

  await page.getByRole("link", { name: "Tunde Adeyemi" }).click();
  await page.getByTestId("build-plan").click();
  await expect(page.getByTestId("infeasible-message")).toBeVisible();
  await page.goto("/advisor");
  await expect(page.getByTestId("advisor-row").first()).toContainText("Tunde");
  await expect(page.getByTestId("advisor-list").locator(":scope > li")).toHaveCount(40);
  await page.getByRole("link", { name: "Next page" }).click();
  await expect(page).toHaveURL(/\/advisor\?page=2$/);
  await expect(page.getByText("Page 2 of 8")).toBeVisible();
  await page.getByTestId("advisor-row").getByRole("link").click();
  await expect(page).toHaveURL(/\/advisor\?page=2&student=/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.locator('[class*="scrim"]').click({ position: { x: 10, y: 10 } });
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/advisor\?page=2$/);
  await page.getByRole("link", { name: "Previous page" }).click();
  await expect(page.getByTestId("advisor-row").first()).toContainText("Tunde");

  await page.goto("/learner/amaka");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("back-on-track:student:amaka:snapshot") !== null)).toBeTruthy();
  await page.locator(".delete-data button").first().click();
  await page.locator(".delete-data__actions button").first().click();
  await expect(page).toHaveURL(/\?deleted=1$/);
  expect(await page.evaluate(() => localStorage.getItem("back-on-track:student:amaka:snapshot"))).toBeNull();
  expect(await page.evaluate(async () => (await (await caches.open("back-on-track-learner-pages-v2")).keys()).some((request) => new URL(request.url).pathname === "/learner/amaka"))).toBeFalsy();
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

test("mobile clock controls open and close from the Clock button", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const toggle = page.getByTestId("clock-toggle");
  const plusThree = page.getByTestId("clock-plus-3");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(plusThree).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(plusThree).toBeVisible();
  await toggle.click();
  await expect(plusThree).toBeHidden();
});

test("English-only mode ignores a saved Pidgin cookie and keeps loading copy below the slider", async ({ page, context }) => {
  await context.addCookies([{ name: "lang", value: "pcm", url: "http://127.0.0.1:3100" }]);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByTestId("language-switch")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/catch-up plan/i);
  await page.route("**/api/demo/reset", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await route.continue();
  });
  await page.getByTestId("start-demo").click();
  const overlay = page.locator("dialog.busy-overlay");
  await expect(overlay).toBeVisible();
  await expect(overlay.locator(".busy-overlay__content > .travel")).toHaveCount(1);
  await expect(overlay.locator(".busy-overlay__content > .busy-overlay__message")).toHaveCount(1);
  for (const viewport of [{ width: 375, height: 812 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport);
    const positions = await overlay.evaluate((dialog) => {
      const slider = dialog.querySelector(".travel")!.getBoundingClientRect();
      const description = dialog.querySelector(".busy-overlay__message")!.getBoundingClientRect();
      const bounds = dialog.getBoundingClientRect();
      return { sliderBottom: slider.bottom, sliderTop: slider.top, descriptionTop: description.top, sliderLeft: slider.left, sliderRight: slider.right, descriptionLeft: description.left, descriptionRight: description.right, dialogLeft: bounds.left, dialogRight: bounds.right };
    });
    expect(positions.sliderBottom).toBeGreaterThan(positions.sliderTop);
    expect(positions.sliderRight).toBeGreaterThan(positions.sliderLeft);
    expect(positions.sliderBottom).toBeLessThan(positions.descriptionTop);
    expect(positions.sliderLeft).toBeGreaterThanOrEqual(positions.dialogLeft);
    expect(positions.sliderRight).toBeLessThanOrEqual(positions.dialogRight);
    expect(positions.descriptionLeft).toBeGreaterThanOrEqual(positions.dialogLeft);
    expect(positions.descriptionRight).toBeLessThanOrEqual(positions.dialogRight);
  }
});

test("advisor can draft again after contact, then sees the weekly limit and saved note", async ({ page, request }) => {
  expect((await request.post("/api/demo/reset")).ok()).toBeTruthy();
  await page.goto("/advisor?student=tunde");
  const drawer = page.getByRole("dialog", { name: "Call notes for Tunde Adeyemi" });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("button", { name: "Draft message" }).click();
  await expect(drawer.getByLabel("Message to learner")).not.toBeEmpty();
  await drawer.getByRole("button", { name: "Mark contacted" }).click();
  await expect(drawer.getByRole("button", { name: "Draft another message" })).toBeEnabled();
  await drawer.getByRole("button", { name: "Draft another message" }).click();
  await expect(drawer).toContainText("2 of 2 message drafts used this week");
  await drawer.getByRole("button", { name: "Mark contacted" }).click();
  await expect(drawer.getByRole("button", { name: "Draft another message" })).toBeDisabled();
  await page.reload();
  await expect(drawer).toContainText("Latest outreach note");
  await expect(drawer).toContainText("contact date is not stored yet");
  await expect(drawer.locator("blockquote")).not.toBeEmpty();
  await expect(drawer.getByRole("button", { name: "Draft another message" })).toBeDisabled();
  expect((await request.post("/api/demo/reset")).ok()).toBeTruthy();
});

test("advisor keeps the list position and opens details again from a lower row", async ({ page }) => {
  await page.goto("/advisor");
  const row = page.getByTestId("advisor-list").locator(":scope > li").last().getByRole("link");
  await row.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  expect(before).toBeGreaterThan(1000);
  await row.click();
  await expect(page.getByRole("dialog", { name: /Call notes for/ })).toBeVisible();
  const afterOpen = await page.evaluate(() => scrollY);
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(page.getByRole("dialog", { name: /Call notes for/ })).toHaveCount(0);
  expect(Math.abs((await page.evaluate(() => scrollY)) - before)).toBeLessThan(5);
  await row.click();
  await expect(page.getByRole("dialog", { name: /Call notes for/ })).toBeVisible();
  expect(Math.abs((await page.evaluate(() => scrollY)) - before)).toBeLessThan(5);
  expect(Math.abs(afterOpen - before)).toBeLessThan(5);
});

test("advisor shows loading feedback for next and previous pages", async ({ page }) => {
  await page.goto("/advisor");
  await page.evaluate(() => {
    const observer = new MutationObserver(() => {
      if (document.querySelector("dialog.busy-overlay")) document.documentElement.dataset.advisorBusySeen = "yes";
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
  await page.getByRole("link", { name: "Next page" }).click();
  await expect(page).toHaveURL(/\/advisor\?page=2$/);
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.advisorBusySeen)).toBe("yes");
  await page.evaluate(() => { delete document.documentElement.dataset.advisorBusySeen; });
  await page.getByRole("link", { name: "Previous page" }).click();
  await expect(page).toHaveURL(/\/advisor$/);
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.advisorBusySeen)).toBe("yes");
});

test("advisor keeps the loading state until a slow learner drawer is ready", async ({ page }) => {
  await page.goto("/advisor");
  await page.route("**/advisor?*", async (route) => {
    if (route.request().url().includes("student=") && route.request().url().includes("_rsc=")) await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });
  await page.getByTestId("advisor-row").getByRole("link").click();
  await expect(page.locator("dialog.busy-overlay")).toBeVisible();
  await expect(page.getByRole("dialog", { name: /Call notes for/ })).toBeVisible();
  await expect(page.locator("dialog.busy-overlay")).toHaveCount(0);
});
