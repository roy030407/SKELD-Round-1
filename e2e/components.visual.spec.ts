import { test, expect } from "@playwright/test"

test.describe("component visual baselines", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/design-system")
    await page.waitForLoadState("networkidle")
  })

  test("Panel default and projector", async ({ page }) => {
    const section = page.locator("[data-testid=panel-section]")
    await expect(section).toHaveScreenshot("panel-variants.png")
  })

  test("Button variants", async ({ page }) => {
    const section = page.locator("[data-testid=button-section]")
    await expect(section).toHaveScreenshot("button-variants.png")
  })

  test("TaskRail variants", async ({ page }) => {
    const section = page.locator("[data-testid=task-rail-section]")
    await expect(section).toHaveScreenshot("task-rail-variants.png")
  })

  test("VotingMotif variants", async ({ page }) => {
    const section = page.locator("[data-testid=voting-motif-section]")
    await expect(section).toHaveScreenshot("voting-motif-variants.png")
  })

  test("HoldToReveal variants", async ({ page }) => {
    const section = page.locator("[data-testid=hold-to-reveal-section]")
    await expect(section).toHaveScreenshot("hold-to-reveal-variants.png")
  })
})
