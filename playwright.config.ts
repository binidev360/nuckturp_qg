import { defineConfig, devices } from "@playwright/test";

/**
 * Base de E2E. Usa o Chrome do sistema (`channel: "chrome"`) em vez de baixar o
 * Chromium do Playwright — o Windows Defender bloqueia o binário em ms-playwright
 * (mesma decisão do Playwright MCP no setup do Marco).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
