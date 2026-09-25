import { test, expect } from "@playwright/test"

test("renders core components", async ({ page }) => {
  test.skip(process.env.NODE_ENV === "production")
  await page.goto("/design-system")
  await expect(page.getByText(/Panel/i).first()).toBeVisible()
  await expect(page.getByText(/Voting Motif/i)).toBeVisible()
  await expect(page.getByText(/Task Rail/i).first()).toBeVisible()
  await expect(page.getByText(/Hold To Reveal/i).first()).toBeVisible()
})
