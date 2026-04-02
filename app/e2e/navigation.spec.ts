import { test, expect } from "@playwright/test";

// Helper: sign in before navigation tests
async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("alex@stride.app");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard");
}

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("sidebar links navigate correctly", async ({ page }) => {
    await page.getByRole("link", { name: "Issues" }).first().click();
    await expect(page).toHaveURL("/issues");

    await page.getByRole("link", { name: "Docs" }).first().click();
    await expect(page).toHaveURL("/docs");

    await page.getByRole("link", { name: "Roadmap" }).first().click();
    await expect(page).toHaveURL("/roadmap");
  });

  test("board page renders kanban columns", async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByText("To Do")).toBeVisible();
    await expect(page.getByText("In Progress")).toBeVisible();
    await expect(page.getByText("In Review")).toBeVisible();
    await expect(page.getByText("Done")).toBeVisible();
  });

  test("command bar opens with keyboard shortcut", async ({ page }) => {
    await page.goto("/dashboard");
    await page.keyboard.press("Meta+k");
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });

  test("inbox shows notifications and mark-all-read works", async ({ page }) => {
    await page.goto("/inbox");
    await expect(page.getByText("Inbox")).toBeVisible();
    await page.getByRole("button", { name: /mark all read/i }).click();
    await expect(page.getByText("0 unread notifications")).toBeVisible();
  });
});
