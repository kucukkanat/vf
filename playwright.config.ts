import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  use: {
    baseURL: 'http://localhost:4173/vf/',
    screenshot: 'only-on-failure',
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: [
    { command: 'node scripts/mock-relay.mjs 7777', port: 7777, reuseExistingServer: true },
    {
      command: 'npx vite build && npx vite preview --port 4173 --strictPort',
      port: 4173,
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        VITE_RELAYS: 'ws://localhost:7777',
        VITE_SEARCH_RELAYS: 'ws://localhost:7777',
        VITE_BLOSSOM: 'http://localhost:7777',
      },
    },
  ],
})
