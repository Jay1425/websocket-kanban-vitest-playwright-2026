// playwright.config.js
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src/tests/e2e", // Path to your test files
  timeout: 30 * 1000, // Test timeout in milliseconds
  use: {
    headless: true, // Run tests in headless mode
    baseURL: "http://localhost:3000", // Replace with your app's base URL
    viewport: { width: 1300, height: 720 }, // Default viewport
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: "npm run dev", // Command to start your server
    port: 3000, // Port your app runs on
    reuseExistingServer: true,
    timeout: 120 * 1000, // Wait time for server start in milliseconds
  },
});
