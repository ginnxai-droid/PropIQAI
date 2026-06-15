import { defineConfig } from "@playwright/test";
import { config as loadEnvironment } from "dotenv";

loadEnvironment({ path: ".env.local", quiet: true });

const webPort = 3200;
const apiPort = 3201;
const appUrl = `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "stage-3-unavailable.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: appUrl,
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1440, height: 1000 },
  },
  webServer: [
    {
      command: "npx tsx server/index.ts",
      url: `http://127.0.0.1:${apiPort}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        API_PORT: String(apiPort),
        APP_URL: appUrl,
        ALLOWED_ORIGINS: appUrl,
        AI_QUALIFICATION_MODE: "unavailable",
      },
    },
    {
      command: `npx vite --port ${webPort} --host 127.0.0.1`,
      url: `${appUrl}/login`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        API_PROXY_TARGET: `http://127.0.0.1:${apiPort}`,
        DISABLE_HMR: "true",
      },
    },
  ],
});
