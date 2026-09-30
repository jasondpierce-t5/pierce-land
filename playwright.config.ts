import { defineConfig, devices } from "@playwright/test";

const port = 3100;
// Optional: point at a preinstalled Chromium (e.g. cloud containers) instead of `playwright install`.
const executablePath = process.env.PW_CHROMIUM_PATH;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${port}`,
    launchOptions: executablePath ? { executablePath } : {},
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "tablet-landscape",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, hasTouch: true },
    },
    {
      name: "tablet-portrait",
      use: { ...devices["Desktop Chrome"], viewport: { width: 800, height: 1280 }, hasTouch: true },
    },
    {
      name: "phone",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true },
    },
  ],
});
