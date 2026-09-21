import { defineConfig, devices } from "@playwright/test";

import { API_URL, WEB_PORT, WEB_URL } from "./e2e/support/env";

// One shared API + database, so tests run serially. API tests create their own
// season so they never disturb the seeded active season the UI tests read.
export default defineConfig({
  testDir: "./e2e/tests",
  globalSetup: "./e2e/support/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: WEB_URL, trace: "retain-on-failure" },
  projects: [
    { name: "api", testMatch: "api/**/*.spec.ts" },
    {
      name: "ui",
      testMatch: "ui/**/*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // The API itself is started in globalSetup (in-process, so login codes can
  // be captured); only the Vite dev server is a webServer.
  webServer: {
    command: `npm run dev --prefix web -- --host 127.0.0.1 --port ${WEB_PORT} --strictPort`,
    url: WEB_URL,
    env: { VITE_API_URL: API_URL },
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
