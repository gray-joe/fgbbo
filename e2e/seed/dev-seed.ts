import { mkdirSync, writeFileSync } from "node:fs";

import { Api } from "../api/client";
import {
  daysFromNow,
  signInAs,
  submitPrediction,
  type TestUser,
} from "../api/world";
import { ADMIN_EMAIL, TMP_DIR } from "../support/env";
import { MANIFEST_PATH, type SeedManifest, type SeedUserKey } from "./manifest";

const BAKERS = ["Alex", "Bo", "Casey", "Dana", "Elliot", "Frankie"];
const USERS: Record<SeedUserKey, { name: string; email: string }> = {
  admin: { name: "Admin", email: ADMIN_EMAIL },
  alice: { name: "Alice", email: "alice@e2e.test" },
  bob: { name: "Bob", email: "bob@e2e.test" },
  cara: { name: "Cara", email: "cara@e2e.test" },
  dan: { name: "Dan", email: "dan@e2e.test" },
};

/**
 * Seeds the dev data set through the public API, then writes a manifest of ids
 * for the tests. Standings for "Seed League" end up as:
 *   Alice 28, Bob 28 (tied, rank 1), Cara 13 (rank 3), Dan 0 (rank 4).
 */
export async function seedDevData(): Promise<SeedManifest> {
  const signedIn = {} as Record<SeedUserKey, TestUser>;
  for (const key of Object.keys(USERS) as SeedUserKey[]) {
    await new Api().must("POST", "/users", USERS[key]);
    signedIn[key] = await signInAs(USERS[key].email);
  }
  const { admin, alice, bob, cara, dan } = signedIn;

  const season = await admin.api.must("POST", "/seasons", { name: "E2E Series", active: true });
  const bakers: Record<string, number> = {};
  for (const name of BAKERS) {
    bakers[name] = (await admin.api.must("POST", "/contestants", { name, eliminated: false, season_id: season.id })).id;
  }

  const themes = ["Cake Week", "Bread Week", "Pastry Week", "Biscuit Week"];
  const weeks: SeedManifest["weeks"] = {};
  for (const [index, theme] of themes.entries()) {
    const number = index + 1;
    // Week 4 is created already locked; the others start open.
    const deadline = number === 4 ? daysFromNow(-1) : daysFromNow(30 * number);
    const week = await admin.api.must("POST", "/weeks", {
      number,
      theme,
      season_id: season.id,
      prediction_deadline: deadline,
    });
    weeks[number] = { id: week.id, number, theme };
  }

  const league = await alice.api.must("POST", "/leagues", { name: "Seed League", season_id: season.id });
  for (const member of [bob, cara, dan]) {
    await member.api.must("POST", "/leagues/join", { invite_code: league.invite_code });
  }

  // Week 1: Alice and Bob predict perfectly, Cara gets star baker and special
  // right, Dan does not predict. Then the result is published and the week locks.
  const perfect = {
    star_baker: bakers.Alex,
    technical_winner: bakers.Bo,
    eliminated: bakers.Casey,
    weekly_special: bakers.Dana,
  };
  const week1 = weeks[1].id;
  await submitPrediction(alice, week1, perfect);
  await submitPrediction(bob, week1, perfect);
  await submitPrediction(cara, week1, {
    star_baker: bakers.Alex,
    technical_winner: bakers.Casey,
    eliminated: bakers.Elliot,
    weekly_special: bakers.Dana,
  });
  await admin.api.must("POST", "/results", { week: week1, ...perfect });
  await admin.api.must("PATCH", `/weeks/${week1}`, { prediction_deadline: daysFromNow(-7) });

  const manifest: SeedManifest = {
    users: Object.fromEntries(
      (Object.keys(USERS) as SeedUserKey[]).map((key) => [
        key,
        { id: signedIn[key].id, name: USERS[key].name, email: USERS[key].email },
      ]),
    ) as SeedManifest["users"],
    season: { id: season.id, name: season.name },
    bakers,
    weeks,
    league: { id: league.id, name: league.name, inviteCode: league.invite_code },
  };
  mkdirSync(TMP_DIR, { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  return manifest;
}
