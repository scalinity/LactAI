import { test, expect } from "@playwright/test";

test.describe("Session CRUD", () => {
  test("navigates to log page and creates a session", async ({ page }) => {
    await page.goto("/");
    
    // Should see the home page
    await expect(page.locator("text=ClaudiaFlow")).toBeVisible();
    
    // Click Log Session CTA
    await page.click("text=Log Session");
    await expect(page).toHaveURL("/log");
    
    // Fill in amount
    const amountInput = page.locator('input[type="number"], input[inputmode="decimal"]').first();
    await amountInput.fill("120");
    
    // Click Save
    await page.click('button:has-text("Save")');
    
    // Should navigate to history or show success
    await expect(page.locator("text=Session saved").or(page.locator("text=History"))).toBeVisible({ timeout: 5000 });
  });

  test("navigates to history page", async ({ page }) => {
    await page.goto("/history");
    await expect(page.locator("text=History")).toBeVisible();
  });

  test("navigates to trends page", async ({ page }) => {
    await page.goto("/trends");
    await expect(page.locator("text=Trends")).toBeVisible();
  });

  test("navigates to settings page", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("text=Settings")).toBeVisible();
  });
});
