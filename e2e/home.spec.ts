import { test, expect } from "@playwright/test";

test("a home renderiza a identidade do QG do Mestre", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /QG do\s*Mestre/i })).toBeVisible();
  await expect(page.getByText(/Nuckturp/i)).toBeVisible();
});
