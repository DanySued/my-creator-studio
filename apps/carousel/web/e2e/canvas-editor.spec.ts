import { test, expect } from "@playwright/test";

// The canvas editor lives behind a password gate. We bypass it by injecting
// the cookie that middleware.ts checks for, set in the Playwright config.

test.describe("Canvas Editor", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/canvas-editor");
    // Wait for Fabric.js to mount – the canvas element appears after dynamic import
    await page.waitForSelector("canvas", { timeout: 15_000 });
  });

  test("page loads with all 7 templates available", async ({ page }) => {
    await page.getByRole("button", { name: /Templates/i }).click();
    // All 7 template names should be visible in the panel
    for (const name of ["Noir", "Sunrise", "Minimal", "Aurora", "Gradient", "Studio", "Pastel"]) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }
  });

  test("tool sidebar shows labels", async ({ page }) => {
    for (const label of ["Select", "Text", "Rectangle", "Circle", "Line", "Draw"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
  });

  test("canvas size buttons render and switch", async ({ page }) => {
    const portrait = page.getByRole("button", { name: "4:5" });
    const story    = page.getByRole("button", { name: "9:16" });
    await expect(portrait).toBeVisible();
    await expect(story).toBeVisible();

    await portrait.click();
    await expect(page.getByText("1080 × 1350")).toBeVisible();

    await story.click();
    await expect(page.getByText("1080 × 1920")).toBeVisible();
  });

  test("slide strip shows add-slide button", async ({ page }) => {
    const addBtn = page.getByTitle("Add slide");
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    // Each slide renders as a relative group card in the strip — should now have 2
    const cards = page.locator("div.relative.group.shrink-0.flex.flex-col.items-center");
    await expect(cards).toHaveCount(2);
  });

  test("Export and Export All buttons visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /^Export$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Export All/ })).toBeVisible();
  });

  test("AI Carousel panel opens and shows tone selector", async ({ page }) => {
    await page.getByRole("button", { name: /AI Carousel/i }).click();
    await expect(page.getByPlaceholder(/5 tips for better sleep/i)).toBeVisible();
    await expect(page.getByRole("combobox").first()).toBeVisible(); // tone select
    await expect(page.getByRole("button", { name: /Generate Carousel/i })).toBeVisible();
  });

  test("properties panel shows background color swatches when nothing selected", async ({ page }) => {
    // Color swatches should be visible as small circle buttons in the properties panel
    const swatches = page.locator("aside").last().locator("button[title='#000000']");
    await expect(swatches.first()).toBeVisible();
  });

  test("selecting text tool and clicking canvas places text object", async ({ page }) => {
    await page.getByTitle("Text").click();
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");
    // Click center of visible canvas
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    // After placing text, properties panel should show font selector
    await expect(page.getByRole("combobox").filter({ hasText: /Arial|Georgia/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test("template thumbnails render in gallery", async ({ page }) => {
    await page.getByRole("button", { name: /Templates/i }).click();
    // Wait for thumbnail images to load (StaticCanvas renders them)
    await page.waitForTimeout(3000);
    const imgs = page.locator("img[alt]");
    await expect(imgs.first()).toBeVisible();
  });
});
