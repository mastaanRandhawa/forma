/**
 * Navigation: top-nav, route transitions, deep links, back/forward.
 */
import { test, expect } from "@playwright/test";
import { loginViaAPI } from "./helpers";

test.beforeEach(async ({ page }) => {
  await loginViaAPI(page);
});

test("top nav shows expected labels", async ({ page }) => {
  await expect(page.getByRole("navigation")).toBeVisible();
  for (const label of ["home", "training", "nutrition", "trainer"]) {
    await expect(page.getByRole("link", { name: new RegExp(label, "i") }).first()).toBeVisible();
  }
});

test("clicking 'training' nav link navigates to /workouts", async ({ page }) => {
  await page.getByRole("link", { name: /training/i }).first().click();
  await expect(page).toHaveURL(/\/workouts/);
});

test("clicking 'nutrition' nav link navigates to /nutrition", async ({ page }) => {
  await page.getByRole("link", { name: /nutrition/i }).first().click();
  await expect(page).toHaveURL(/\/nutrition/);
});

test("clicking 'trainer' nav link navigates to /trainer", async ({ page }) => {
  await page.getByRole("link", { name: /trainer/i }).first().click();
  await expect(page).toHaveURL(/\/trainer/);
});

test("clicking 'home' nav link navigates to /dashboard", async ({ page }) => {
  await page.goto("/workouts");
  await page.getByRole("link", { name: /home/i }).first().click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test("/ redirects to /dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("/training redirects to /workouts", async ({ page }) => {
  await page.goto("/training");
  await expect(page).toHaveURL(/\/workouts/);
});

test("browser back button returns to previous page", async ({ page }) => {
  await page.goto("/workouts");
  await expect(page).toHaveURL(/\/workouts/);
  await page.goto("/nutrition");
  await expect(page).toHaveURL(/\/nutrition/);
  await page.goBack();
  await expect(page).toHaveURL(/\/workouts/);
});

test("settings page loads with sub-navigation", async ({ page }) => {
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/settings/);
  // settings should show some category links
  await expect(page.getByText(/appearance|training|account/i).first()).toBeVisible({ timeout: 8_000 });
});

test("settings sub-routes render without errors", async ({ page }) => {
  for (const sub of ["training", "appearance", "account"]) {
    await page.goto(`/settings/${sub}`);
    await expect(page).toHaveURL(new RegExp(`/settings/${sub}`));
    // no crash / blank page
    await expect(page.locator("main")).toBeVisible();
  }
});

test("exercise library page loads", async ({ page }) => {
  await page.goto("/exercise-library");
  await expect(page).toHaveURL(/\/exercise-library/);
  await expect(page.locator("main")).toBeVisible();
});

test("records page loads", async ({ page }) => {
  await page.goto("/records");
  await expect(page).toHaveURL(/\/records/);
  await expect(page.locator("main")).toBeVisible();
});

test("progress page loads", async ({ page }) => {
  await page.goto("/progress");
  await expect(page.locator("main")).toBeVisible();
});

test("body page loads", async ({ page }) => {
  await page.goto("/body");
  await expect(page.locator("main")).toBeVisible();
});
