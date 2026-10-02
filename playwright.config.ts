import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3102";
const recording = process.env.PLAYWRIGHT_RECORD === "1";

export default defineConfig({
  testDir: "./tests", fullyParallel: true, workers: 2, retries: process.env.CI ? 1 : 0, reporter: "list", timeout: recording ? 150_000 : 45_000,
  use: { baseURL, browserName: "chromium", trace: "retain-on-failure", reducedMotion: "reduce", video: recording ? { mode: "on", size: { width: 1440, height: 1000 } } : "off", launchOptions: recording ? { slowMo: 1200 } : {} },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : { command: "npm run dev -- --hostname 127.0.0.1 --port 3102", url: baseURL, reuseExistingServer: !process.env.CI, env: { APP_MODE: "demo" }, timeout: 120_000 },
});