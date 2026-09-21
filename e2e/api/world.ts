import { ADMIN_EMAIL } from "../support/env";
import { takeCode } from "../support/mailbox";
import { Api } from "./client";

const runId = Date.now().toString(36);
let counter = 0;

export const uniqueEmail = (label: string) => `${label}-${runId}-${++counter}@e2e.test`;

export interface TestUser {
  id: number;
  name: string;
  email: string;
  token: string;
  api: Api;
}

/** Runs the real login flow (request code, read it from the mailbox, verify). */
export async function login(email: string): Promise<{ token: string; user: { id: number; name: string } }> {
  await new Api().must("POST", "/auth/login", { email });
  return new Api().must("POST", "/auth/login/verify", { email, code: takeCode(email) });
}

export async function signInAs(email: string): Promise<TestUser> {
  const { token, user } = await login(email);
  return { id: user.id, name: user.name, email, token, api: new Api(token) };
}

/** Registers a brand-new user with a unique email and signs them in. */
export async function newUser(label = "user"): Promise<TestUser> {
  const email = uniqueEmail(label);
  const name = `${label} ${counter}`;
  await new Api().must("POST", "/users", { name, email });
  return signInAs(email);
}

export const newAdmin = () => signInAs(ADMIN_EMAIL);

// --- competition fixtures ---

export const BAKER_NAMES = ["Alex", "Bo", "Casey", "Dana", "Elliot", "Frankie"] as const;
export type BakerName = (typeof BAKER_NAMES)[number];

export interface Picks {
  star_baker: number;
  technical_winner: number;
  eliminated: number;
  weekly_special: number;
}

export interface SeasonFixture {
  id: number;
  bakers: Record<BakerName, number>;
  weeks: { id: number; number: number }[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const daysFromNow = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();

/**
 * Creates an inactive season with six bakers and `weekCount` open weeks. It is
 * inactive so it never disturbs the seeded active season the UI tests use.
 */
export async function createSeason(admin: TestUser, weekCount = 2): Promise<SeasonFixture> {
  const season = await admin.api.must("POST", "/seasons", {
    name: `Series ${uniqueEmail("s")}`,
    active: false,
  });
  const bakers = {} as Record<BakerName, number>;
  for (const name of BAKER_NAMES) {
    bakers[name] = (await admin.api.must("POST", "/contestants", { name, eliminated: false, season_id: season.id })).id;
  }
  const weeks: SeasonFixture["weeks"] = [];
  for (let number = 1; number <= weekCount; number++) {
    const week = await admin.api.must("POST", "/weeks", {
      number,
      theme: `Week ${number}`,
      season_id: season.id,
      prediction_deadline: daysFromNow(7 * number),
    });
    weeks.push({ id: week.id, number });
  }
  return { id: season.id, bakers, weeks };
}

export function picks(
  season: SeasonFixture,
  star: BakerName,
  technical: BakerName,
  eliminated: BakerName,
  special: BakerName,
): Picks {
  return {
    star_baker: season.bakers[star],
    technical_winner: season.bakers[technical],
    eliminated: season.bakers[eliminated],
    weekly_special: season.bakers[special],
  };
}

/** Moves a week's deadline into the past so predictions lock. */
export const lockWeek = (admin: TestUser, weekId: number) =>
  admin.api.must("PATCH", `/weeks/${weekId}`, { prediction_deadline: daysFromNow(-1) });

export const submitPrediction = (user: TestUser, weekId: number, p: Picks) =>
  user.api.post("/predictions", { week_id: weekId, ...p });

export const publishResult = (admin: TestUser, weekId: number, p: Picks) =>
  admin.api.post("/results", { week: weekId, ...p });

export async function createLeague(owner: TestUser, season: SeasonFixture, name = "League") {
  return owner.api.must("POST", "/leagues", { name, season_id: season.id });
}

export async function joinLeague(user: TestUser, inviteCode: string) {
  return user.api.must("POST", "/leagues/join", { invite_code: inviteCode });
}

export interface StandingRow {
  user_id: number;
  total_points: number;
  correct_predictions: number;
  rank: number;
  star_baker_points: number;
  technical_winner_points: number;
  eliminated_points: number;
  weekly_special_points: number;
}

export async function standings(user: TestUser, leagueId: number): Promise<StandingRow[]> {
  return (await user.api.must("GET", `/leagues/${leagueId}/standings`)).data;
}
