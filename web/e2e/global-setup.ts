import { request } from '@playwright/test';
import path from 'path';
import fs from 'fs';

export const AUTH_FILE = path.join(__dirname, '../playwright/.auth/user.json');

/**
 * Runs once before all tests.
 *
 * If APP_PASSWORD is available (production-like env), POSTs to the login API
 * and saves the __session cookie so tests work against an authenticated server.
 *
 * If APP_PASSWORD is not set (local dev without .env loaded), the middleware
 * skips auth entirely when AUTH_SECRET is also absent, so we write an empty
 * storage-state file and tests proceed without a cookie.
 */
export default async function globalSetup() {
  const password = process.env.APP_PASSWORD;

  if (!password) {
    // No auth configured locally — write empty storage state and continue
    fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  const ctx = await request.newContext({ baseURL: 'http://localhost:3000' });

  const res = await ctx.post('/api/auth/login', {
    data: { password },
  });

  if (!res.ok()) {
    throw new Error(
      `Playwright global-setup: login failed (${res.status()}). ` +
        `Check APP_PASSWORD env var or dev server.`
    );
  }

  await ctx.storageState({ path: AUTH_FILE });
  await ctx.dispose();
}
