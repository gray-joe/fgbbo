import { test as base, expect, type BrowserContext, type Page } from "@playwright/test";

import { createSeason, newAdmin, type SeasonFixture, type TestUser } from "./api/world";
import { loadSeed, type SeedManifest } from "./seed/manifest";
import { WEB_URL } from "./support/env";

/** Opens a browser page already signed in as `user` (a fresh context per call). */
export type SignedInPage = (user: Pick<TestUser, "id" | "name" | "email" | "token">) => Promise<Page>;

interface Fixtures {
  signedInPage: SignedInPage;
  /**
   * A fresh season with three open weeks, made the active season for the test
   * (the admin screens work on the active season). The seeded season is made
   * active again afterwards, so other tests still find it.
   */
  activeSeason: SeasonFixture;
}

interface WorkerFixtures {
  seed: SeedManifest;
  admin: TestUser;
}

export const test = base.extend<Fixtures, WorkerFixtures>({
  seed: [async ({}, use) => use(loadSeed()), { scope: "worker" }],
  admin: [async ({}, use) => use(await newAdmin()), { scope: "worker" }],

  activeSeason: async ({ admin, seed }, use) => {
    const season = await createSeason(admin, 3);
    await admin.api.must("PATCH", `/seasons/${season.id}`, { active: true });
    try {
      await use(season);
    } finally {
      await admin.api.must("PATCH", `/seasons/${seed.season.id}`, { active: true });
    }
  },

  signedInPage: async ({ browser }, use) => {
    const contexts: BrowserContext[] = [];
    await use(async (user) => {
      const context = await browser.newContext({
        baseURL: WEB_URL,
        storageState: {
          cookies: [],
          origins: [
            {
              origin: WEB_URL,
              localStorage: [
                { name: "token", value: user.token },
                {
                  name: "user",
                  value: JSON.stringify({ id: user.id, name: user.name, email: user.email, active: true }),
                },
              ],
            },
          ],
        },
      });
      contexts.push(context);
      return context.newPage();
    });
    await Promise.all(contexts.map((context) => context.close()));
  },
});

export { expect };
