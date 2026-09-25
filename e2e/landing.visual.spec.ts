import { test, expect } from "@playwright/test"

test("hero matches baseline", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/")
  await page.waitForLoadState("networkidle")
  await expect(page).toHaveScreenshot("landing-full.png", {
    fullPage: true,
    mask: [page.locator("[data-testid=crewmate]")],
  })
})

test("Check In CTA is visible", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("link", { name: /check in/i })).toBeVisible()
})
