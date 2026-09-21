import { strict as assert } from "node:assert";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, test } from "node:test";

import { createServer } from "../src/server";

let server: Server;
let baseUrl: string;
let adminToken: string;
let defaultSeasonId: number;

const pendingLoginCodes = new Map<string, string>();

before(async () => {
  server = createServer({
    databasePath: ":memory:",
    adminEmails: ["admin@example.com"],
    deliverLoginCode: (email, code) => pendingLoginCodes.set(email, code),
  });
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", resolve),
  );
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
  await register("Admin", "admin@example.com");
  adminToken = (await login("admin@example.com")).token;
  const seasonResponse = await postJson(
    "/seasons",
    { name: "Default Season", active: true },
    adminToken,
  );
  defaultSeasonId = ((await seasonResponse.json()) as { id: number }).id;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

function errorBody(
  code: string,
  message: string,
  details: Record<string, unknown> = {},
) {
  return { error: { code, message, details } };
}

function listBody<T>(
  data: T[],
  nextCursor: number | null = null,
  limit = 20,
) {
  return { data, pagination: { next_cursor: nextCursor, limit } };
}

async function request(
  method: string,
  path: string,
  token?: string,
  body?: unknown,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const getJson = (path: string, token?: string) => request("GET", path, token);
const postJson = (path: string, body: unknown, token?: string) =>
  request("POST", path, token, body);
const patchJson = (path: string, body: unknown, token?: string) =>
  request("PATCH", path, token, body);
const deleteJson = (path: string, token?: string) =>
  request("DELETE", path, token);

interface UserRecord {
  id: number;
  name: string;
  email: string;
  created_at: string;
  active: boolean;
  deleted_at: string | null;
}

interface ContestantRecord {
  id: number;
  name: string;
  eliminated: boolean;
  season_id: number;
}

interface WeekRecord {
  id: number;
  number: number;
  theme: string;
  season_id: number;
  prediction_deadline: string;
}

interface LeagueRecord {
  id: number;
  name: string;
  owner: number;
  season_id: number;
  archived_at: string | null;
  invite_code: string | null;
}

interface SeasonRecord {
  id: number;
  name: string;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

interface PredictionRecord {
  id: number;
  user_id: number;
  week_id: number;
  star_baker: number;
  technical_winner: number;
  eliminated: number;
  weekly_special: number;
  created_at: string;
  updated_at: string;
}

interface Session {
  token: string;
  user: UserRecord;
}

interface ScoreEntry {
  user_id: number;
  star_baker_points: number;
  technical_winner_points: number;
  eliminated_points: number;
  weekly_special_points: number;
  total_points: number;
  correct_predictions: number;
  rank: number;
}

async function register(name: string, email: string): Promise<UserRecord> {
  const response = await postJson("/users", { name, email });
  return (await response.json()) as UserRecord;
}

async function requestLoginCode(email: string): Promise<void> {
  const response = await postJson("/auth/login", { email });
  assert.equal(response.status, 200);
}

async function login(email: string): Promise<Session> {
  await requestLoginCode(email);
  const code = pendingLoginCodes.get(email);
  assert.ok(code, `no login code was issued for ${email}`);
  const response = await postJson("/auth/login/verify", { email, code });
  return (await response.json()) as Session;
}

async function registerAndLogin(name: string, email: string): Promise<Session> {
  await register(name, email);
  return login(email);
}

async function createSeason(name: string, active = false): Promise<SeasonRecord> {
  const response = await postJson("/seasons", { name, active }, adminToken);
  return (await response.json()) as SeasonRecord;
}

async function createContestant(
  token: string,
  name: string,
  eliminated = false,
  seasonId = defaultSeasonId,
): Promise<ContestantRecord> {
  const response = await postJson(
    "/contestants",
    { name, eliminated, season_id: seasonId },
    token,
  );
  return (await response.json()) as ContestantRecord;
}

function farFutureDeadline(): string {
  return new Date(Date.now() + 3600_000).toISOString();
}

async function createWeek(
  token: string,
  number: number,
  theme: string,
  seasonId = defaultSeasonId,
  predictionDeadline = farFutureDeadline(),
): Promise<WeekRecord> {
  const response = await postJson(
    "/weeks",
    {
      number,
      theme,
      season_id: seasonId,
      prediction_deadline: predictionDeadline,
    },
    token,
  );
  return (await response.json()) as WeekRecord;
}

async function createLeague(
  token: string,
  name: string,
  seasonId = defaultSeasonId,
): Promise<LeagueRecord> {
  const response = await postJson(
    "/leagues",
    { name, season_id: seasonId },
    token,
  );
  return (await response.json()) as LeagueRecord;
}

async function submitPrediction(
  token: string,
  leagueId: number,
  weekId: number,
  picks: {
    star_baker: number;
    technical_winner: number;
    eliminated: number;
    weekly_special: number;
  },
): Promise<Response> {
  return postJson(
    `/leagues/${leagueId}/predictions`,
    { week_id: weekId, ...picks },
    token,
  );
}

async function publishResult(
  token: string,
  weekId: number,
  picks: {
    star_baker: number;
    technical_winner: number;
    eliminated: number;
    weekly_special: number;
  },
): Promise<{ id: number }> {
  const response = await postJson(
    "/results",
    { week: weekId, ...picks },
    token,
  );
  return (await response.json()) as { id: number };
}

test("GET / returns a greeting", async () => {
  const response = await fetch(`${baseUrl}/`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    message: "Hello from the Node API!",
  });
});

test("GET /health reports API health", async () => {
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("login succeeds with a valid code and fails otherwise", async () => {
  const email = "login-tester@example.com";
  await register("Login Tester", email);

  await requestLoginCode(email);
  const code = pendingLoginCodes.get(email);
  assert.ok(code);

  const badCodeResponse = await postJson("/auth/login/verify", {
    email,
    code: "000000",
  });
  assert.equal(badCodeResponse.status, 401);
  assert.deepEqual(
    await badCodeResponse.json(),
    errorBody("UNAUTHENTICATED", "Invalid or expired code"),
  );

  const unknownEmailResponse = await postJson("/auth/login/verify", {
    email: "nobody@example.com",
    code: "000000",
  });
  assert.equal(unknownEmailResponse.status, 401);

  const goodResponse = await postJson("/auth/login/verify", { email, code });
  assert.equal(goodResponse.status, 200);
  const { token } = (await goodResponse.json()) as Session;
  assert.ok(token);

  // Codes are single-use.
  const reusedCodeResponse = await postJson("/auth/login/verify", {
    email,
    code,
  });
  assert.equal(reusedCodeResponse.status, 401);

  const authedResponse = await getJson("/users", token);
  assert.equal(authedResponse.status, 200);

  const logoutResponse = await deleteJson("/auth/logout", token);
  assert.equal(logoutResponse.status, 204);

  const afterLogoutResponse = await getJson("/users", token);
  assert.equal(afterLogoutResponse.status, 401);
});

test("users can be created, read, updated, listed, and deleted", async () => {
  const createResponse = await postJson("/users", {
    name: "Ada Lovelace",
    email: "ada@example.com",
  });
  assert.equal(createResponse.status, 201);
  const createdUser = (await createResponse.json()) as UserRecord;
  assert.equal(createdUser.name, "Ada Lovelace");
  assert.equal(createdUser.email, "ada@example.com");
  assert.equal(createdUser.active, true);
  assert.equal(createdUser.deleted_at, null);
  assert.ok(!Number.isNaN(Date.parse(createdUser.created_at)));

  const { token } = await login("ada@example.com");

  const getResponse = await getJson(`/users/${createdUser.id}`, token);
  assert.equal(getResponse.status, 200);
  assert.equal(
    ((await getResponse.json()) as { email: string }).email,
    "ada@example.com",
  );

  const listResponse = await getJson("/users", token);
  assert.equal(listResponse.status, 200);
  const listed = (await listResponse.json()) as { data: UserRecord[] };
  assert.ok(listed.data.some((user) => user.id === createdUser.id));

  const updateResponse = await patchJson(
    `/users/${createdUser.id}`,
    { name: "Ada Byron", active: false },
    token,
  );
  assert.equal(updateResponse.status, 200);
  const updatedUser = (await updateResponse.json()) as {
    name: string;
    active: boolean;
  };
  assert.equal(updatedUser.name, "Ada Byron");
  assert.equal(updatedUser.active, false);

  const deleteResponse = await deleteJson(
    `/users/${createdUser.id}`,
    adminToken,
  );
  assert.equal(deleteResponse.status, 204);

  const missingResponse = await getJson(
    `/users/${createdUser.id}`,
    adminToken,
  );
  assert.equal(missingResponse.status, 404);
});

test("PATCH /users updates only the provided field", async () => {
  const { token, user } = await registerAndLogin(
    "Partial Patch User",
    "partial@example.com",
  );

  const response = await patchJson(
    `/users/${user.id}`,
    { active: false },
    token,
  );
  assert.equal(response.status, 200);
  const updated = (await response.json()) as UserRecord;
  assert.equal(updated.name, "Partial Patch User");
  assert.equal(updated.email, "partial@example.com");
  assert.equal(updated.active, false);
});

test("deactivating a user invalidates their session and blocks future logins", async () => {
  const { token, user } = await registerAndLogin(
    "Deactivate Me",
    "deactivate-me@example.com",
  );

  const deactivateResponse = await patchJson(
    `/users/${user.id}`,
    { active: false },
    adminToken,
  );
  assert.equal(deactivateResponse.status, 200);

  const responseAfterDeactivation = await getJson("/users", token);
  assert.equal(responseAfterDeactivation.status, 401);

  const requestResponse = await postJson("/auth/login", {
    email: "deactivate-me@example.com",
  });
  assert.equal(requestResponse.status, 200);

  const verifyResponse = await postJson("/auth/login/verify", {
    email: "deactivate-me@example.com",
    code: "000000",
  });
  assert.equal(verifyResponse.status, 401);
  assert.deepEqual(
    await verifyResponse.json(),
    errorBody("UNAUTHENTICATED", "Invalid or expired code"),
  );
});

test("users cannot update another user's account, but admins can", async () => {
  const alice = await registerAndLogin("Alice Guard", "alice-guard@example.com");
  const bob = await registerAndLogin("Bob Guard", "bob-guard@example.com");

  const response = await patchJson(
    `/users/${bob.user.id}`,
    { name: "Hacked" },
    alice.token,
  );
  assert.equal(response.status, 403);
  assert.deepEqual(
    await response.json(),
    errorBody("FORBIDDEN", "You may only update your own account"),
  );

  const adminResponse = await patchJson(
    `/users/${bob.user.id}`,
    { name: "Admin Edit" },
    adminToken,
  );
  assert.equal(adminResponse.status, 200);
});

test("GET /users requires authentication", async () => {
  const response = await getJson("/users");
  assert.equal(response.status, 401);
  assert.deepEqual(
    await response.json(),
    errorBody("UNAUTHENTICATED", "Authentication required"),
  );
});

test("POST /users validates input", async () => {
  const response = await postJson("/users", { name: "" });

  assert.equal(response.status, 400);
});

test("seasons can be created, read, updated, and listed; only one stays active", async () => {
  const firstResponse = await postJson(
    "/seasons",
    { name: "Series A", active: true },
    adminToken,
  );
  assert.equal(firstResponse.status, 201);
  const first = (await firstResponse.json()) as SeasonRecord;
  assert.equal(first.active, true);
  assert.equal(first.starts_at, null);
  assert.equal(first.ends_at, null);

  const secondResponse = await postJson(
    "/seasons",
    { name: "Series B", active: true },
    adminToken,
  );
  assert.equal(secondResponse.status, 201);
  const second = (await secondResponse.json()) as SeasonRecord;
  assert.equal(second.active, true);

  const firstAfter = (await (
    await getJson(`/seasons/${first.id}`, adminToken)
  ).json()) as SeasonRecord;
  assert.equal(firstAfter.active, false);

  const patchResponse = await patchJson(
    `/seasons/${first.id}`,
    { name: "Series A Renamed" },
    adminToken,
  );
  assert.equal(patchResponse.status, 200);
  const patched = (await patchResponse.json()) as SeasonRecord;
  assert.equal(patched.name, "Series A Renamed");
  assert.equal(patched.active, false);

  const listResponse = await getJson("/seasons", adminToken);
  assert.equal(listResponse.status, 200);
  const listed = (await listResponse.json()) as { data: SeasonRecord[] };
  assert.ok(listed.data.some((season) => season.id === second.id));
});

test("mutating seasons requires an administrator", async () => {
  const member = await registerAndLogin(
    "Non Admin Season",
    "non-admin-season@example.com",
  );
  const response = await postJson(
    "/seasons",
    { name: "Sneaky Season" },
    member.token,
  );
  assert.equal(response.status, 403);
  assert.deepEqual(
    await response.json(),
    errorBody("FORBIDDEN", "Administrator access required"),
  );
});

test("contestants can be created, read, updated, listed, and deleted", async () => {
  const createdContestant = await createContestant(adminToken, "Alice", false);
  assert.equal(createdContestant.name, "Alice");
  assert.equal(createdContestant.eliminated, false);
  assert.equal(createdContestant.season_id, defaultSeasonId);

  const getResponse = await getJson(
    `/contestants/${createdContestant.id}`,
    adminToken,
  );
  assert.equal(getResponse.status, 200);
  assert.deepEqual(await getResponse.json(), createdContestant);

  const listResponse = await getJson("/contestants", adminToken);
  assert.equal(listResponse.status, 200);
  assert.deepEqual(await listResponse.json(), listBody([createdContestant]));

  const updateResponse = await patchJson(
    `/contestants/${createdContestant.id}`,
    { eliminated: true },
    adminToken,
  );
  assert.equal(updateResponse.status, 200);
  assert.deepEqual(await updateResponse.json(), {
    ...createdContestant,
    eliminated: true,
  });

  const deleteResponse = await deleteJson(
    `/contestants/${createdContestant.id}`,
    adminToken,
  );
  assert.equal(deleteResponse.status, 204);

  const missingResponse = await getJson(
    `/contestants/${createdContestant.id}`,
    adminToken,
  );
  assert.equal(missingResponse.status, 404);
});

test("POST /contestants validates input", async () => {
  const response = await postJson("/contestants", { name: "Alice" }, adminToken);

  assert.equal(response.status, 400);
});

test("POST /contestants requires a valid season_id", async () => {
  const missing = await postJson(
    "/contestants",
    { name: "No Season", eliminated: false },
    adminToken,
  );
  assert.equal(missing.status, 400);

  const invalid = await postJson(
    "/contestants",
    { name: "Bad Season", eliminated: false, season_id: 999999 },
    adminToken,
  );
  assert.equal(invalid.status, 404);
  assert.deepEqual(
    await invalid.json(),
    errorBody("NOT_FOUND", "Season not found"),
  );
});

test("mutating contestants requires an administrator", async () => {
  const member = await registerAndLogin(
    "Non Admin Contestant",
    "non-admin-contestant@example.com",
  );
  const response = await postJson(
    "/contestants",
    { name: "Bob", eliminated: false, season_id: defaultSeasonId },
    member.token,
  );
  assert.equal(response.status, 403);
  assert.deepEqual(
    await response.json(),
    errorBody("FORBIDDEN", "Administrator access required"),
  );
});

test("GET /contestants paginates with limit and cursor", async () => {
  const sentinel = await createContestant(adminToken, "Pagination Sentinel");
  const first = await createContestant(adminToken, "Pagination Page One");
  const second = await createContestant(adminToken, "Pagination Page Two");
  const third = await createContestant(adminToken, "Pagination Page Three");

  const page1Response = await getJson(
    `/contestants?limit=2&cursor=${sentinel.id}`,
    adminToken,
  );
  assert.equal(page1Response.status, 200);
  const page1 = (await page1Response.json()) as {
    data: ContestantRecord[];
    pagination: { next_cursor: number | null; limit: number };
  };
  assert.deepEqual(
    page1.data.map((c) => c.id),
    [first.id, second.id],
  );
  assert.equal(page1.pagination.next_cursor, second.id);
  assert.equal(page1.pagination.limit, 2);

  const page2Response = await getJson(
    `/contestants?limit=2&cursor=${page1.pagination.next_cursor}`,
    adminToken,
  );
  const page2 = (await page2Response.json()) as {
    data: ContestantRecord[];
    pagination: { next_cursor: number | null; limit: number };
  };
  assert.deepEqual(
    page2.data.map((c) => c.id),
    [third.id],
  );
  assert.equal(page2.pagination.next_cursor, null);
});

test("GET /contestants rejects an invalid limit", async () => {
  const response = await getJson("/contestants?limit=0", adminToken);

  assert.equal(response.status, 400);
  assert.deepEqual(
    await response.json(),
    errorBody("VALIDATION_ERROR", "Invalid limit, cursor, or season_id"),
  );
});

test("weeks can be created, read, updated, listed, and deleted", async () => {
  const createdWeek = await createWeek(adminToken, 1, "Premiere");
  assert.equal(createdWeek.number, 1);
  assert.equal(createdWeek.theme, "Premiere");
  assert.equal(createdWeek.season_id, defaultSeasonId);
  assert.ok(!Number.isNaN(Date.parse(createdWeek.prediction_deadline)));

  const getResponse = await getJson(`/weeks/${createdWeek.id}`, adminToken);
  assert.equal(getResponse.status, 200);
  assert.deepEqual(await getResponse.json(), createdWeek);

  const listResponse = await getJson("/weeks", adminToken);
  assert.equal(listResponse.status, 200);
  assert.deepEqual(await listResponse.json(), listBody([createdWeek]));

  const updateResponse = await patchJson(
    `/weeks/${createdWeek.id}`,
    { number: 2, theme: "Heroes" },
    adminToken,
  );
  assert.equal(updateResponse.status, 200);
  assert.deepEqual(await updateResponse.json(), {
    ...createdWeek,
    number: 2,
    theme: "Heroes",
  });

  const deleteResponse = await deleteJson(`/weeks/${createdWeek.id}`, adminToken);
  assert.equal(deleteResponse.status, 204);

  const missingResponse = await getJson(`/weeks/${createdWeek.id}`, adminToken);
  assert.equal(missingResponse.status, 404);
});

test("PATCH /weeks updates only the provided field", async () => {
  const week = await createWeek(adminToken, 2, "Partial Patch Week");

  const response = await patchJson(
    `/weeks/${week.id}`,
    { theme: "Renamed" },
    adminToken,
  );
  assert.equal(response.status, 200);
  const updated = (await response.json()) as WeekRecord;
  assert.equal(updated.number, 2);
  assert.equal(updated.theme, "Renamed");
  assert.equal(updated.prediction_deadline, week.prediction_deadline);
});

test("POST /weeks validates input", async () => {
  const response = await postJson(
    "/weeks",
    { number: 0, theme: "" },
    adminToken,
  );

  assert.equal(response.status, 400);
});

test("POST /weeks requires a valid season_id and prediction_deadline", async () => {
  const missing = await postJson(
    "/weeks",
    { number: 500, theme: "No Season" },
    adminToken,
  );
  assert.equal(missing.status, 400);

  const invalidSeason = await postJson(
    "/weeks",
    {
      number: 501,
      theme: "Bad Season",
      season_id: 999999,
      prediction_deadline: farFutureDeadline(),
    },
    adminToken,
  );
  assert.equal(invalidSeason.status, 404);
  assert.deepEqual(
    await invalidSeason.json(),
    errorBody("NOT_FOUND", "Season not found"),
  );
});

test("mutating weeks requires an administrator", async () => {
  const member = await registerAndLogin(
    "Non Admin Week",
    "non-admin-week@example.com",
  );
  const response = await postJson(
    "/weeks",
    {
      number: 900,
      theme: "Sneaky",
      season_id: defaultSeasonId,
      prediction_deadline: farFutureDeadline(),
    },
    member.token,
  );
  assert.equal(response.status, 403);
  assert.deepEqual(
    await response.json(),
    errorBody("FORBIDDEN", "Administrator access required"),
  );
});

test("POST /weeks rejects a duplicate week number", async () => {
  const deadline = farFutureDeadline();
  const firstResponse = await postJson(
    "/weeks",
    {
      number: 10,
      theme: "Pastry",
      season_id: defaultSeasonId,
      prediction_deadline: deadline,
    },
    adminToken,
  );
  assert.equal(firstResponse.status, 201);

  const duplicateResponse = await postJson(
    "/weeks",
    {
      number: 10,
      theme: "Also Pastry",
      season_id: defaultSeasonId,
      prediction_deadline: deadline,
    },
    adminToken,
  );
  assert.equal(duplicateResponse.status, 409);
  assert.deepEqual(
    await duplicateResponse.json(),
    errorBody("CONFLICT", "A week with this number already exists in this season"),
  );
});

test("PATCH /weeks rejects renumbering onto an existing week number", async () => {
  await createWeek(adminToken, 11, "Bread Week");
  const second = await createWeek(adminToken, 12, "Dessert Week");

  const renumberResponse = await patchJson(
    `/weeks/${second.id}`,
    { number: 11 },
    adminToken,
  );
  assert.equal(renumberResponse.status, 409);
  assert.deepEqual(
    await renumberResponse.json(),
    errorBody("CONFLICT", "A week with this number already exists in this season"),
  );
});

test("week numbers are unique per season, not globally", async () => {
  const otherSeason = await createSeason("Other Number Season");

  await createWeek(adminToken, 777, "Default Season Week");
  const response = await postJson(
    "/weeks",
    {
      number: 777,
      theme: "Other Season Week",
      season_id: otherSeason.id,
      prediction_deadline: farFutureDeadline(),
    },
    adminToken,
  );
  assert.equal(response.status, 201);
});

test("results can be created, read, updated, listed, and deleted", async () => {
  const week = await createWeek(adminToken, 3, "Bread");

  const contestantIds: number[] = [];
  for (const name of ["Baker One", "Baker Two", "Baker Three", "Baker Four"]) {
    contestantIds.push((await createContestant(adminToken, name)).id);
  }

  const resultInput = {
    week: week.id,
    star_baker: contestantIds[0],
    technical_winner: contestantIds[1],
    eliminated: contestantIds[2],
    weekly_special: contestantIds[3],
  };
  const createResponse = await postJson("/results", resultInput, adminToken);
  assert.equal(createResponse.status, 201);
  const createdResult = (await createResponse.json()) as {
    id: number;
    week: number;
    star_baker: number;
    technical_winner: number;
    eliminated: number;
    weekly_special: number;
  };
  assert.deepEqual(createdResult, { id: createdResult.id, ...resultInput });

  const getResponse = await getJson(`/results/${createdResult.id}`, adminToken);
  assert.equal(getResponse.status, 200);
  assert.deepEqual(await getResponse.json(), createdResult);

  const listResponse = await getJson("/results", adminToken);
  assert.equal(listResponse.status, 200);
  assert.deepEqual(await listResponse.json(), listBody([createdResult]));

  const updatedInput = {
    star_baker: contestantIds[1],
    technical_winner: contestantIds[0],
  };
  const updateResponse = await patchJson(
    `/results/${createdResult.id}`,
    updatedInput,
    adminToken,
  );
  assert.equal(updateResponse.status, 200);
  assert.deepEqual(await updateResponse.json(), {
    ...resultInput,
    ...updatedInput,
    id: createdResult.id,
  });

  const deleteResponse = await deleteJson(
    `/results/${createdResult.id}`,
    adminToken,
  );
  assert.equal(deleteResponse.status, 204);

  const missingResponse = await getJson(
    `/results/${createdResult.id}`,
    adminToken,
  );
  assert.equal(missingResponse.status, 404);
});

test("mutating results requires an administrator", async () => {
  const member = await registerAndLogin(
    "Non Admin Result",
    "non-admin-result@example.com",
  );
  const response = await postJson(
    "/results",
    {
      week: 999999,
      star_baker: 999999,
      technical_winner: 999999,
      eliminated: 999999,
      weekly_special: 999999,
    },
    member.token,
  );
  assert.equal(response.status, 403);
  assert.deepEqual(
    await response.json(),
    errorBody("FORBIDDEN", "Administrator access required"),
  );
});

test("POST /results requires existing references", async () => {
  const response = await postJson(
    "/results",
    {
      week: 999999,
      star_baker: 999999,
      technical_winner: 999999,
      eliminated: 999999,
      weekly_special: 999999,
    },
    adminToken,
  );

  assert.equal(response.status, 404);
  assert.deepEqual(
    await response.json(),
    errorBody("NOT_FOUND", "Week not found"),
  );
});

test("POST /results rejects a contestant from another season", async () => {
  const otherSeason = await createSeason("Cross Season");
  const outsideContestant = await createContestant(
    adminToken,
    "Outsider",
    false,
    otherSeason.id,
  );
  const week = await createWeek(adminToken, 888, "Cross Season Week");

  const contestantIds: number[] = [];
  for (const name of ["Cross One", "Cross Two", "Cross Three"]) {
    contestantIds.push((await createContestant(adminToken, name)).id);
  }

  const response = await postJson(
    "/results",
    {
      week: week.id,
      star_baker: outsideContestant.id,
      technical_winner: contestantIds[0],
      eliminated: contestantIds[1],
      weekly_special: contestantIds[2],
    },
    adminToken,
  );
  assert.equal(response.status, 400);
  assert.deepEqual(
    await response.json(),
    errorBody(
      "VALIDATION_ERROR",
      "Contestant for star_baker belongs to a different season",
    ),
  );
});

test("DELETE /contestants and /weeks reject deletion while referenced by a result", async () => {
  const week = await createWeek(adminToken, 30, "Referenced Week");

  const contestantIds: number[] = [];
  for (const name of ["Ref One", "Ref Two", "Ref Three", "Ref Four"]) {
    contestantIds.push((await createContestant(adminToken, name)).id);
  }

  await postJson(
    "/results",
    {
      week: week.id,
      star_baker: contestantIds[0],
      technical_winner: contestantIds[1],
      eliminated: contestantIds[2],
      weekly_special: contestantIds[3],
    },
    adminToken,
  );

  const deleteContestantResponse = await deleteJson(
    `/contestants/${contestantIds[0]}`,
    adminToken,
  );
  assert.equal(deleteContestantResponse.status, 409);
  assert.deepEqual(
    await deleteContestantResponse.json(),
    errorBody("CONFLICT", "Contestant is referenced by an official result"),
  );

  const deleteWeekResponse = await deleteJson(`/weeks/${week.id}`, adminToken);
  assert.equal(deleteWeekResponse.status, 409);
  assert.deepEqual(
    await deleteWeekResponse.json(),
    errorBody("CONFLICT", "Week is referenced by an official result"),
  );
});

test("publishing a result marks the eliminated contestant as eliminated", async () => {
  const week = await createWeek(adminToken, 20, "Elimination Test");

  const contestantIds: number[] = [];
  for (const name of ["Elim One", "Elim Two", "Elim Three", "Elim Four"]) {
    contestantIds.push((await createContestant(adminToken, name)).id);
  }

  const createResponse = await postJson(
    "/results",
    {
      week: week.id,
      star_baker: contestantIds[0],
      technical_winner: contestantIds[1],
      eliminated: contestantIds[2],
      weekly_special: contestantIds[3],
    },
    adminToken,
  );
  const createdResult = (await createResponse.json()) as { id: number };

  const eliminatedContestant = (await (
    await getJson(`/contestants/${contestantIds[2]}`, adminToken)
  ).json()) as { eliminated: boolean };
  assert.equal(eliminatedContestant.eliminated, true);

  const untouchedContestant = (await (
    await getJson(`/contestants/${contestantIds[0]}`, adminToken)
  ).json()) as { eliminated: boolean };
  assert.equal(untouchedContestant.eliminated, false);

  const correctionResponse = await patchJson(
    `/results/${createdResult.id}`,
    { eliminated: contestantIds[3], weekly_special: contestantIds[2] },
    adminToken,
  );
  assert.equal(correctionResponse.status, 200);

  const revertedContestant = (await (
    await getJson(`/contestants/${contestantIds[2]}`, adminToken)
  ).json()) as { eliminated: boolean };
  assert.equal(revertedContestant.eliminated, false);

  const newlyEliminatedContestant = (await (
    await getJson(`/contestants/${contestantIds[3]}`, adminToken)
  ).json()) as { eliminated: boolean };
  assert.equal(newlyEliminatedContestant.eliminated, true);

  await deleteJson(`/results/${createdResult.id}`, adminToken);

  const afterDeleteContestant = (await (
    await getJson(`/contestants/${contestantIds[3]}`, adminToken)
  ).json()) as { eliminated: boolean };
  assert.equal(afterDeleteContestant.eliminated, false);
});

test("POST /results rejects an already-eliminated contestant", async () => {
  const firstWeek = await createWeek(adminToken, 21, "First Week");
  const secondWeek = await createWeek(adminToken, 22, "Second Week");

  const contestantIds: number[] = [];
  for (const name of ["Already One", "Already Two", "Already Three", "Already Four"]) {
    contestantIds.push((await createContestant(adminToken, name)).id);
  }

  await postJson(
    "/results",
    {
      week: firstWeek.id,
      star_baker: contestantIds[0],
      technical_winner: contestantIds[1],
      eliminated: contestantIds[2],
      weekly_special: contestantIds[3],
    },
    adminToken,
  );

  const secondResultResponse = await postJson(
    "/results",
    {
      week: secondWeek.id,
      star_baker: contestantIds[2],
      technical_winner: contestantIds[1],
      eliminated: contestantIds[0],
      weekly_special: contestantIds[3],
    },
    adminToken,
  );
  assert.equal(secondResultResponse.status, 409);
  assert.deepEqual(
    await secondResultResponse.json(),
    errorBody(
      "CONFLICT",
      "Contestant for star_baker is already eliminated",
    ),
  );
});

test("POST /results rejects a second result for the same week", async () => {
  const week = await createWeek(adminToken, 4, "Chocolate");

  const contestantIds: number[] = [];
  for (const name of ["Duplicate One", "Duplicate Two", "Duplicate Three", "Duplicate Four"]) {
    contestantIds.push((await createContestant(adminToken, name)).id);
  }

  const resultInput = {
    week: week.id,
    star_baker: contestantIds[0],
    technical_winner: contestantIds[1],
    eliminated: contestantIds[2],
    weekly_special: contestantIds[3],
  };
  const firstCreate = await postJson("/results", resultInput, adminToken);
  assert.equal(firstCreate.status, 201);

  const secondCreate = await postJson("/results", resultInput, adminToken);
  assert.equal(secondCreate.status, 409);
  assert.deepEqual(
    await secondCreate.json(),
    errorBody("CONFLICT", "A result already exists for this week"),
  );
});

test("PATCH /results rejects moving a result onto a week that already has one", async () => {
  const weekA = await createWeek(adminToken, 5, "Biscuits");
  const weekB = await createWeek(adminToken, 6, "Cake");

  const createContestants = async (names: string[]): Promise<number[]> => {
    const ids: number[] = [];
    for (const name of names) {
      ids.push((await createContestant(adminToken, name)).id);
    }
    return ids;
  };
  const contestantIdsA = await createContestants([
    "Conflict A One",
    "Conflict A Two",
    "Conflict A Three",
    "Conflict A Four",
  ]);
  const contestantIdsB = await createContestants([
    "Conflict B One",
    "Conflict B Two",
    "Conflict B Three",
    "Conflict B Four",
  ]);

  const buildInput = (week: number, contestantIds: number[]) => ({
    week,
    star_baker: contestantIds[0],
    technical_winner: contestantIds[1],
    eliminated: contestantIds[2],
    weekly_special: contestantIds[3],
  });

  await postJson(
    "/results",
    buildInput(weekA.id, contestantIdsA),
    adminToken,
  );
  const secondResultResponse = await postJson(
    "/results",
    buildInput(weekB.id, contestantIdsB),
    adminToken,
  );
  const secondResult = (await secondResultResponse.json()) as { id: number };

  const moveResponse = await patchJson(
    `/results/${secondResult.id}`,
    { week: weekA.id },
    adminToken,
  );
  assert.equal(moveResponse.status, 409);
  assert.deepEqual(
    await moveResponse.json(),
    errorBody("CONFLICT", "A result already exists for this week"),
  );
});

test("leagues can be created, read, updated, listed, and archived", async () => {
  const owner = await registerAndLogin(
    "League Creator",
    "league-creator@example.com",
  );
  const member = await registerAndLogin(
    "League Member Transfer",
    "league-member-transfer@example.com",
  );

  const createdLeague = await createLeague(owner.token, "Premier League");
  assert.equal(createdLeague.name, "Premier League");
  assert.equal(createdLeague.owner, owner.user.id);
  assert.equal(createdLeague.season_id, defaultSeasonId);
  assert.equal(createdLeague.archived_at, null);
  assert.ok(createdLeague.invite_code);

  const getResponse = await getJson(
    `/leagues/${createdLeague.id}`,
    owner.token,
  );
  assert.equal(getResponse.status, 200);
  assert.deepEqual(await getResponse.json(), createdLeague);

  const listResponse = await getJson("/leagues", owner.token);
  assert.equal(listResponse.status, 200);
  const listed = (await listResponse.json()) as { data: LeagueRecord[] };
  assert.deepEqual(listed.data, [createdLeague]);

  const joinResponse = await postJson(
    "/leagues/join",
    { invite_code: createdLeague.invite_code },
    member.token,
  );
  assert.equal(joinResponse.status, 201);

  const updateResponse = await patchJson(
    `/leagues/${createdLeague.id}`,
    { name: "Championship", owner: member.user.id },
    owner.token,
  );
  assert.equal(updateResponse.status, 200);
  const updatedLeague = (await updateResponse.json()) as LeagueRecord;
  assert.equal(updatedLeague.name, "Championship");
  assert.equal(updatedLeague.owner, member.user.id);

  const oldOwnerArchiveAttempt = await deleteJson(
    `/leagues/${createdLeague.id}`,
    owner.token,
  );
  assert.equal(oldOwnerArchiveAttempt.status, 403);

  const archiveResponse = await deleteJson(
    `/leagues/${createdLeague.id}`,
    member.token,
  );
  assert.equal(archiveResponse.status, 204);

  const afterArchiveResponse = await getJson(
    `/leagues/${createdLeague.id}`,
    member.token,
  );
  assert.equal(afterArchiveResponse.status, 200);
  const archivedLeague = (await afterArchiveResponse.json()) as LeagueRecord;
  assert.notEqual(archivedLeague.archived_at, null);
});

test("PATCH /leagues updates only the provided field", async () => {
  const owner = await registerAndLogin(
    "Partial Patch Owner",
    "partial-owner@example.com",
  );
  const league = await createLeague(owner.token, "Partial Patch League");

  const response = await patchJson(
    `/leagues/${league.id}`,
    { name: "Renamed League" },
    owner.token,
  );
  assert.equal(response.status, 200);
  const updated = (await response.json()) as LeagueRecord;
  assert.equal(updated.name, "Renamed League");
  assert.equal(updated.owner, owner.user.id);
});

test("POST /leagues requires a valid season_id", async () => {
  const owner = await registerAndLogin(
    "No Season League Owner",
    "no-season-league@example.com",
  );

  const missing = await postJson(
    "/leagues",
    { name: "No Season League" },
    owner.token,
  );
  assert.equal(missing.status, 400);

  const invalid = await postJson(
    "/leagues",
    { name: "Bad Season League", season_id: 999999 },
    owner.token,
  );
  assert.equal(invalid.status, 404);
  assert.deepEqual(
    await invalid.json(),
    errorBody("NOT_FOUND", "Season not found"),
  );
});

test("PATCH /leagues rejects transferring ownership to a non-member", async () => {
  const owner = await registerAndLogin(
    "Transfer Owner",
    "transfer-owner@example.com",
  );
  const outsider = await registerAndLogin(
    "Transfer Outsider",
    "transfer-outsider@example.com",
  );
  const league = await createLeague(owner.token, "Transfer League");

  const response = await patchJson(
    `/leagues/${league.id}`,
    { owner: outsider.user.id },
    owner.token,
  );
  assert.equal(response.status, 409);
  assert.deepEqual(
    await response.json(),
    errorBody("CONFLICT", "New owner must already be a league member"),
  );
});

test("PATCH /leagues rejects transferring ownership to a nonexistent user", async () => {
  const owner = await registerAndLogin(
    "Transfer Owner Two",
    "transfer-owner-two@example.com",
  );
  const league = await createLeague(owner.token, "Transfer League Two");

  const response = await patchJson(
    `/leagues/${league.id}`,
    { owner: 999999 },
    owner.token,
  );
  assert.equal(response.status, 404);
  assert.deepEqual(
    await response.json(),
    errorBody("NOT_FOUND", "Owner user not found"),
  );
});

test("league invite code is hidden from non-owner members but visible to the owner", async () => {
  const owner = await registerAndLogin(
    "Code Owner",
    "code-owner@example.com",
  );
  const member = await registerAndLogin(
    "Code Member",
    "code-member@example.com",
  );
  const league = await createLeague(owner.token, "Code League");

  await postJson(
    "/leagues/join",
    { invite_code: league.invite_code },
    member.token,
  );

  const memberView = (await (
    await getJson(`/leagues/${league.id}`, member.token)
  ).json()) as LeagueRecord;
  assert.equal(memberView.invite_code, null);

  const ownerView = (await (
    await getJson(`/leagues/${league.id}`, owner.token)
  ).json()) as LeagueRecord;
  assert.equal(ownerView.invite_code, league.invite_code);
});

test("non-members cannot view a league", async () => {
  const owner = await registerAndLogin(
    "Private Owner",
    "private-owner@example.com",
  );
  const stranger = await registerAndLogin(
    "Stranger",
    "stranger@example.com",
  );
  const league = await createLeague(owner.token, "Private League");

  const response = await getJson(`/leagues/${league.id}`, stranger.token);
  assert.equal(response.status, 403);
  assert.deepEqual(
    await response.json(),
    errorBody("FORBIDDEN", "Only league members may view this league"),
  );

  const adminView = await getJson(`/leagues/${league.id}`, adminToken);
  assert.equal(adminView.status, 200);
});

test("joining a league by invite code adds the member; a stale rotated code is rejected", async () => {
  const owner = await registerAndLogin(
    "Invite Owner",
    "invite-owner@example.com",
  );
  const joiner = await registerAndLogin(
    "Invite Joiner",
    "invite-joiner@example.com",
  );
  const league = await createLeague(owner.token, "Invite League");
  const staleCode = league.invite_code as string;

  const rotateResponse = await postJson(
    `/leagues/${league.id}/invite-code`,
    {},
    owner.token,
  );
  assert.equal(rotateResponse.status, 200);
  const rotated = (await rotateResponse.json()) as LeagueRecord;
  assert.notEqual(rotated.invite_code, staleCode);

  const staleJoinResponse = await postJson(
    "/leagues/join",
    { invite_code: staleCode },
    joiner.token,
  );
  assert.equal(staleJoinResponse.status, 404);
  assert.deepEqual(
    await staleJoinResponse.json(),
    errorBody("NOT_FOUND", "Invalid invite code"),
  );

  const joinResponse = await postJson(
    "/leagues/join",
    { invite_code: rotated.invite_code },
    joiner.token,
  );
  assert.equal(joinResponse.status, 201);

  const duplicateJoinResponse = await postJson(
    "/leagues/join",
    { invite_code: rotated.invite_code },
    joiner.token,
  );
  assert.equal(duplicateJoinResponse.status, 409);
});

test("only the league owner may rotate the invite code", async () => {
  const owner = await registerAndLogin(
    "Rotate Owner",
    "rotate-owner@example.com",
  );
  const outsider = await registerAndLogin(
    "Rotate Outsider",
    "rotate-outsider@example.com",
  );
  const league = await createLeague(owner.token, "Rotate League");

  const response = await postJson(
    `/leagues/${league.id}/invite-code`,
    {},
    outsider.token,
  );
  assert.equal(response.status, 403);
  assert.deepEqual(
    await response.json(),
    errorBody(
      "FORBIDDEN",
      "Only the league owner may rotate the invite code",
    ),
  );
});

test("archiving a league blocks mutation but keeps history readable", async () => {
  const owner = await registerAndLogin(
    "Archive Owner",
    "archive-owner@example.com",
  );
  const member = await registerAndLogin(
    "Archive Member",
    "archive-member@example.com",
  );
  const league = await createLeague(owner.token, "Archive League");

  const joinResponse = await postJson(
    `/leagues/${league.id}/players`,
    { user_id: member.user.id },
    owner.token,
  );
  assert.equal(joinResponse.status, 201);

  const archiveResponse = await deleteJson(
    `/leagues/${league.id}`,
    owner.token,
  );
  assert.equal(archiveResponse.status, 204);

  const membersResponse = await getJson(
    `/leagues/${league.id}/players`,
    owner.token,
  );
  assert.equal(membersResponse.status, 200);
  assert.deepEqual(
    await membersResponse.json(),
    listBody([
      { league_id: league.id, user_id: owner.user.id },
      { league_id: league.id, user_id: member.user.id },
    ]),
  );

  const reArchiveResponse = await deleteJson(
    `/leagues/${league.id}`,
    owner.token,
  );
  assert.equal(reArchiveResponse.status, 409);
  assert.deepEqual(
    await reArchiveResponse.json(),
    errorBody("CONFLICT", "League is already archived"),
  );

  const patchResponse = await patchJson(
    `/leagues/${league.id}`,
    { name: "Renamed" },
    owner.token,
  );
  assert.equal(patchResponse.status, 409);
  assert.deepEqual(
    await patchResponse.json(),
    errorBody("CONFLICT", "League is archived"),
  );

  const anotherUser = await registerAndLogin(
    "Archive Joiner",
    "archive-joiner@example.com",
  );
  const blockedJoinResponse = await postJson(
    `/leagues/${league.id}/players`,
    { user_id: anotherUser.user.id },
    owner.token,
  );
  assert.equal(blockedJoinResponse.status, 409);
  assert.deepEqual(
    await blockedJoinResponse.json(),
    errorBody("CONFLICT", "League is archived"),
  );

  const blockedLeaveResponse = await deleteJson(
    `/leagues/${league.id}/players/${member.user.id}`,
    member.token,
  );
  assert.equal(blockedLeaveResponse.status, 409);
  assert.deepEqual(
    await blockedLeaveResponse.json(),
    errorBody("CONFLICT", "League is archived"),
  );
});

test("a user can join multiple leagues and leave one; the owner cannot leave without transferring", async () => {
  const owner = await registerAndLogin("League Owner", "owner@example.com");
  const player = await registerAndLogin("Player", "player@example.com");

  const firstLeague = await createLeague(owner.token, "First League");
  const secondLeague = await createLeague(owner.token, "Second League");

  for (const league of [firstLeague, secondLeague]) {
    const response = await postJson(
      `/leagues/${league.id}/players`,
      { user_id: player.user.id },
      owner.token,
    );
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), {
      league_id: league.id,
      user_id: player.user.id,
    });
  }

  const firstListResponse = await getJson(
    `/leagues/${firstLeague.id}/players`,
    owner.token,
  );
  assert.deepEqual(
    await firstListResponse.json(),
    listBody([
      { league_id: firstLeague.id, user_id: owner.user.id },
      { league_id: firstLeague.id, user_id: player.user.id },
    ]),
  );

  const duplicateResponse = await postJson(
    `/leagues/${firstLeague.id}/players`,
    { user_id: player.user.id },
    owner.token,
  );
  assert.equal(duplicateResponse.status, 409);
  assert.deepEqual(
    await duplicateResponse.json(),
    errorBody("CONFLICT", "User is already in this league"),
  );

  const removeResponse = await deleteJson(
    `/leagues/${firstLeague.id}/players/${player.user.id}`,
    player.token,
  );
  assert.equal(removeResponse.status, 204);

  const emptyListResponse = await getJson(
    `/leagues/${firstLeague.id}/players`,
    owner.token,
  );
  assert.deepEqual(
    await emptyListResponse.json(),
    listBody([{ league_id: firstLeague.id, user_id: owner.user.id }]),
  );

  const secondListResponse = await getJson(
    `/leagues/${secondLeague.id}/players`,
    owner.token,
  );
  assert.deepEqual(
    await secondListResponse.json(),
    listBody([
      { league_id: secondLeague.id, user_id: owner.user.id },
      { league_id: secondLeague.id, user_id: player.user.id },
    ]),
  );

  const ownerLeaveResponse = await deleteJson(
    `/leagues/${secondLeague.id}/players/${owner.user.id}`,
    owner.token,
  );
  assert.equal(ownerLeaveResponse.status, 409);
  assert.deepEqual(
    await ownerLeaveResponse.json(),
    errorBody(
      "CONFLICT",
      "The league owner must transfer ownership before leaving",
    ),
  );
});

test("predictions can be created, edited before the deadline, and lock afterward", async () => {
  const owner = await registerAndLogin(
    "Prediction Owner",
    "prediction-owner@example.com",
  );
  const member = await registerAndLogin(
    "Prediction Member",
    "prediction-member@example.com",
  );
  const league = await createLeague(owner.token, "Prediction League");
  await postJson(
    "/leagues/join",
    { invite_code: league.invite_code },
    member.token,
  );

  const deadline = new Date(Date.now() + 1500).toISOString();
  const week = await createWeek(
    adminToken,
    950,
    "Prediction Week",
    defaultSeasonId,
    deadline,
  );

  const contestantIds: number[] = [];
  for (const name of ["Pred One", "Pred Two", "Pred Three", "Pred Four"]) {
    contestantIds.push((await createContestant(adminToken, name)).id);
  }

  const buildPicks = () => ({
    star_baker: contestantIds[0],
    technical_winner: contestantIds[1],
    eliminated: contestantIds[2],
    weekly_special: contestantIds[3],
  });

  const createResponse = await postJson(
    `/leagues/${league.id}/predictions`,
    { week_id: week.id, ...buildPicks() },
    owner.token,
  );
  assert.equal(createResponse.status, 201);

  const duplicateResponse = await postJson(
    `/leagues/${league.id}/predictions`,
    { week_id: week.id, ...buildPicks() },
    owner.token,
  );
  assert.equal(duplicateResponse.status, 409);
  assert.deepEqual(
    await duplicateResponse.json(),
    errorBody("CONFLICT", "You already have a prediction for this week"),
  );

  const memberListBeforeLock = await getJson(
    `/leagues/${league.id}/predictions`,
    member.token,
  );
  assert.deepEqual(await memberListBeforeLock.json(), listBody([]));

  const memberSingleBeforeLock = await getJson(
    `/leagues/${league.id}/weeks/${week.id}/prediction`,
    member.token,
  );
  assert.equal(memberSingleBeforeLock.status, 404);

  const editResponse = await patchJson(
    `/leagues/${league.id}/weeks/${week.id}/prediction`,
    { weekly_special: contestantIds[2] },
    owner.token,
  );
  assert.equal(editResponse.status, 200);
  const edited = (await editResponse.json()) as PredictionRecord;
  assert.equal(edited.weekly_special, contestantIds[2]);

  const adminView = (await (
    await getJson(`/leagues/${league.id}/predictions`, adminToken)
  ).json()) as { data: PredictionRecord[] };
  assert.equal(adminView.data.length, 1);

  await new Promise((resolve) => setTimeout(resolve, 1800));

  const memberListAfterLock = (await (
    await getJson(`/leagues/${league.id}/predictions`, member.token)
  ).json()) as { data: PredictionRecord[] };
  assert.equal(memberListAfterLock.data.length, 1);
  assert.equal(memberListAfterLock.data[0].user_id, owner.user.id);

  const lockedEditResponse = await patchJson(
    `/leagues/${league.id}/weeks/${week.id}/prediction`,
    { weekly_special: contestantIds[3] },
    owner.token,
  );
  assert.equal(lockedEditResponse.status, 409);
  assert.deepEqual(
    await lockedEditResponse.json(),
    errorBody("PREDICTION_LOCKED", "Predictions for this week are locked"),
  );

  const lateCreateResponse = await postJson(
    `/leagues/${league.id}/predictions`,
    { week_id: week.id, ...buildPicks() },
    member.token,
  );
  assert.equal(lateCreateResponse.status, 409);
  assert.deepEqual(
    await lateCreateResponse.json(),
    errorBody("PREDICTION_LOCKED", "Predictions for this week are locked"),
  );
});

test("a user can create, view, and edit predictions without belonging to any league", async () => {
  const user = await registerAndLogin(
    "Leagueless Picker",
    "leagueless-picker@example.com",
  );

  const week = await createWeek(
    adminToken,
    951,
    "Leagueless Week",
    defaultSeasonId,
    new Date(Date.now() + 60_000).toISOString(),
  );
  const contestantIds: number[] = [];
  for (const name of ["Free One", "Free Two", "Free Three", "Free Four"]) {
    contestantIds.push((await createContestant(adminToken, name)).id);
  }
  const picks = {
    star_baker: contestantIds[0],
    technical_winner: contestantIds[1],
    eliminated: contestantIds[2],
    weekly_special: contestantIds[3],
  };

  const missingResponse = await getJson(
    `/weeks/${week.id}/prediction`,
    user.token,
  );
  assert.equal(missingResponse.status, 404);

  const createResponse = await postJson(
    "/predictions",
    { week_id: week.id, ...picks },
    user.token,
  );
  assert.equal(createResponse.status, 201);
  const created = (await createResponse.json()) as PredictionRecord;
  assert.equal(created.user_id, user.user.id);

  const getResponse = await getJson(
    `/weeks/${week.id}/prediction`,
    user.token,
  );
  assert.equal(getResponse.status, 200);

  const editResponse = await patchJson(
    `/weeks/${week.id}/prediction`,
    { weekly_special: contestantIds[0] },
    user.token,
  );
  assert.equal(editResponse.status, 200);
  const edited = (await editResponse.json()) as PredictionRecord;
  assert.equal(edited.weekly_special, contestantIds[0]);
});

test("a user's predictions are league-agnostic: shared and scored across every league they're in", async () => {
  const user = await registerAndLogin(
    "Shared Picks User",
    "shared-picks-user@example.com",
  );
  const otherOwner = await registerAndLogin(
    "Shared Picks Other Owner",
    "shared-picks-other-owner@example.com",
  );
  const leagueA = await createLeague(user.token, "Shared Picks League A");
  const leagueB = await createLeague(otherOwner.token, "Shared Picks League B");
  await postJson(
    "/leagues/join",
    { invite_code: leagueB.invite_code },
    user.token,
  );

  const deadline = new Date(Date.now() + 1500).toISOString();
  const week = await createWeek(
    adminToken,
    970,
    "Shared Picks Week",
    defaultSeasonId,
    deadline,
  );
  const contestantIds: number[] = [];
  for (const name of ["Shared One", "Shared Two", "Shared Three", "Shared Four"]) {
    contestantIds.push((await createContestant(adminToken, name)).id);
  }
  const [c1, c2, c3, c4] = contestantIds;
  const picks = { star_baker: c1, technical_winner: c2, eliminated: c3, weekly_special: c4 };

  const createResponse = await submitPrediction(user.token, leagueA.id, week.id, picks);
  assert.equal(createResponse.status, 201);

  // Submitting again through a different league the same user belongs to
  // hits the same underlying (user, week) prediction.
  const duplicateViaOtherLeague = await submitPrediction(
    user.token,
    leagueB.id,
    week.id,
    picks,
  );
  assert.equal(duplicateViaOtherLeague.status, 409);
  assert.deepEqual(
    await duplicateViaOtherLeague.json(),
    errorBody("CONFLICT", "You already have a prediction for this week"),
  );

  // The same picks are visible from either league's single-prediction view.
  const viaA = (await (
    await getJson(`/leagues/${leagueA.id}/weeks/${week.id}/prediction`, user.token)
  ).json()) as PredictionRecord;
  const viaB = (await (
    await getJson(`/leagues/${leagueB.id}/weeks/${week.id}/prediction`, user.token)
  ).json()) as PredictionRecord;
  assert.equal(viaA.id, viaB.id);
  assert.equal(viaA.star_baker, c1);
  assert.equal(viaB.star_baker, c1);

  // Editing through league B updates what league A sees too.
  const editResponse = await patchJson(
    `/leagues/${leagueB.id}/weeks/${week.id}/prediction`,
    { star_baker: c2 },
    user.token,
  );
  assert.equal(editResponse.status, 200);
  const afterEditViaA = (await (
    await getJson(`/leagues/${leagueA.id}/weeks/${week.id}/prediction`, user.token)
  ).json()) as PredictionRecord;
  assert.equal(afterEditViaA.star_baker, c2);

  await new Promise((resolve) => setTimeout(resolve, 1800));
  await publishResult(adminToken, week.id, {
    star_baker: c2,
    technical_winner: c2,
    eliminated: c3,
    weekly_special: c4,
  });

  // The one shared prediction scores independently in both leagues.
  const scoresA = (await (
    await getJson(`/leagues/${leagueA.id}/weeks/${week.id}/scores`, user.token)
  ).json()) as { data: ScoreEntry[] };
  const scoresB = (await (
    await getJson(`/leagues/${leagueB.id}/weeks/${week.id}/scores`, user.token)
  ).json()) as { data: ScoreEntry[] };
  assert.equal(scoresA.data[0].total_points, 28);
  assert.equal(scoresB.data[0].total_points, 28);
});

test("non-members cannot view or create predictions", async () => {
  const owner = await registerAndLogin(
    "Pred Owner NM",
    "pred-owner-nm@example.com",
  );
  const stranger = await registerAndLogin(
    "Pred Stranger",
    "pred-stranger@example.com",
  );
  const league = await createLeague(owner.token, "Pred NM League");
  const week = await createWeek(adminToken, 951, "NM Week");
  const contestant = await createContestant(adminToken, "NM Contestant");

  const listResponse = await getJson(
    `/leagues/${league.id}/predictions`,
    stranger.token,
  );
  assert.equal(listResponse.status, 403);

  const createResponse = await postJson(
    `/leagues/${league.id}/predictions`,
    {
      week_id: week.id,
      star_baker: contestant.id,
      technical_winner: contestant.id,
      eliminated: contestant.id,
      weekly_special: contestant.id,
    },
    stranger.token,
  );
  assert.equal(createResponse.status, 403);
});

test("predictions are rejected for an archived league", async () => {
  const owner = await registerAndLogin(
    "Pred Archive Owner",
    "pred-archive-owner@example.com",
  );
  const league = await createLeague(owner.token, "Pred Archive League");
  const week = await createWeek(adminToken, 952, "Archive Pred Week");
  const contestant = await createContestant(adminToken, "Archive Pred Contestant");
  await deleteJson(`/leagues/${league.id}`, owner.token);

  const response = await postJson(
    `/leagues/${league.id}/predictions`,
    {
      week_id: week.id,
      star_baker: contestant.id,
      technical_winner: contestant.id,
      eliminated: contestant.id,
      weekly_special: contestant.id,
    },
    owner.token,
  );
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), errorBody("CONFLICT", "League is archived"));
});

test("predictions reject a week from another season and an already-eliminated contestant", async () => {
  const owner = await registerAndLogin(
    "Pred Cross Owner",
    "pred-cross-owner@example.com",
  );
  const league = await createLeague(owner.token, "Pred Cross League");

  const otherSeason = await createSeason("Pred Cross Season");
  const otherWeek = await createWeek(
    adminToken,
    1,
    "Other Season Week",
    otherSeason.id,
  );
  const contestant = await createContestant(adminToken, "Pred Cross Contestant");

  const crossSeasonResponse = await postJson(
    `/leagues/${league.id}/predictions`,
    {
      week_id: otherWeek.id,
      star_baker: contestant.id,
      technical_winner: contestant.id,
      eliminated: contestant.id,
      weekly_special: contestant.id,
    },
    owner.token,
  );
  assert.equal(crossSeasonResponse.status, 400);
  assert.deepEqual(
    await crossSeasonResponse.json(),
    errorBody(
      "VALIDATION_ERROR",
      "Week does not belong to this league's season",
    ),
  );

  const eliminatedContestant = await createContestant(
    adminToken,
    "Pred Eliminated",
    true,
  );
  const week = await createWeek(adminToken, 953, "Pred Elim Week");
  const eliminatedResponse = await postJson(
    `/leagues/${league.id}/predictions`,
    {
      week_id: week.id,
      star_baker: eliminatedContestant.id,
      technical_winner: contestant.id,
      eliminated: contestant.id,
      weekly_special: contestant.id,
    },
    owner.token,
  );
  assert.equal(eliminatedResponse.status, 409);
  assert.deepEqual(
    await eliminatedResponse.json(),
    errorBody("CONFLICT", "Contestant for star_baker is already eliminated"),
  );
});

test("publishing a result scores predictions with the correct category points and ranks", async () => {
  const owner = await registerAndLogin("Score Owner", "score-owner@example.com");
  const member = await registerAndLogin("Score Member", "score-member@example.com");
  const league = await createLeague(owner.token, "Score League");
  await postJson(
    "/leagues/join",
    { invite_code: league.invite_code },
    member.token,
  );

  const deadline = new Date(Date.now() + 1200).toISOString();
  const week = await createWeek(
    adminToken,
    960,
    "Score Week",
    defaultSeasonId,
    deadline,
  );

  const contestantIds: number[] = [];
  for (const name of ["Score One", "Score Two", "Score Three", "Score Four", "Score Five"]) {
    contestantIds.push((await createContestant(adminToken, name)).id);
  }
  const [c1, c2, c3, c4, c5] = contestantIds;

  await submitPrediction(owner.token, league.id, week.id, {
    star_baker: c1,
    technical_winner: c2,
    eliminated: c3,
    weekly_special: c4,
  });
  await submitPrediction(member.token, league.id, week.id, {
    star_baker: c5,
    technical_winner: c5,
    eliminated: c5,
    weekly_special: c5,
  });

  await new Promise((resolve) => setTimeout(resolve, 1500));

  const publishResponse = await postJson(
    "/results",
    {
      week: week.id,
      star_baker: c1,
      technical_winner: c2,
      eliminated: c3,
      weekly_special: c4,
    },
    adminToken,
  );
  assert.equal(publishResponse.status, 201);

  const scoresResponse = await getJson(
    `/leagues/${league.id}/weeks/${week.id}/scores`,
    owner.token,
  );
  assert.equal(scoresResponse.status, 200);
  const scores = (await scoresResponse.json()) as { data: ScoreEntry[] };
  const ownerScore = scores.data.find((entry) => entry.user_id === owner.user.id)!;
  const memberScore = scores.data.find((entry) => entry.user_id === member.user.id)!;

  assert.deepEqual(
    {
      star_baker_points: ownerScore.star_baker_points,
      technical_winner_points: ownerScore.technical_winner_points,
      eliminated_points: ownerScore.eliminated_points,
      weekly_special_points: ownerScore.weekly_special_points,
      total_points: ownerScore.total_points,
      correct_predictions: ownerScore.correct_predictions,
      rank: ownerScore.rank,
    },
    {
      star_baker_points: 10,
      technical_winner_points: 5,
      eliminated_points: 10,
      weekly_special_points: 3,
      total_points: 28,
      correct_predictions: 4,
      rank: 1,
    },
  );
  assert.deepEqual(
    {
      total_points: memberScore.total_points,
      correct_predictions: memberScore.correct_predictions,
      rank: memberScore.rank,
    },
    { total_points: 0, correct_predictions: 0, rank: 2 },
  );
});

test("correcting a result recalculates scores", async () => {
  const owner = await registerAndLogin(
    "Correct Owner",
    "correct-owner@example.com",
  );
  const league = await createLeague(owner.token, "Correct League");

  const deadline = new Date(Date.now() + 1200).toISOString();
  const week = await createWeek(
    adminToken,
    961,
    "Correct Week",
    defaultSeasonId,
    deadline,
  );

  const contestantIds: number[] = [];
  for (const name of ["Correct One", "Correct Two", "Correct Three", "Correct Four", "Correct Five"]) {
    contestantIds.push((await createContestant(adminToken, name)).id);
  }
  const [c1, c2, c3, c4, c5] = contestantIds;

  await submitPrediction(owner.token, league.id, week.id, {
    star_baker: c1,
    technical_winner: c2,
    eliminated: c3,
    weekly_special: c4,
  });

  await new Promise((resolve) => setTimeout(resolve, 1500));

  const result = await publishResult(adminToken, week.id, {
    star_baker: c1,
    technical_winner: c2,
    eliminated: c3,
    weekly_special: c4,
  });

  const beforeResponse = await getJson(
    `/leagues/${league.id}/weeks/${week.id}/scores`,
    owner.token,
  );
  const before = (await beforeResponse.json()) as { data: ScoreEntry[] };
  assert.equal(before.data[0].total_points, 28);

  const correctionResponse = await patchJson(
    `/results/${result.id}`,
    { technical_winner: c5 },
    adminToken,
  );
  assert.equal(correctionResponse.status, 200);

  const afterResponse = await getJson(
    `/leagues/${league.id}/weeks/${week.id}/scores`,
    owner.token,
  );
  const after = (await afterResponse.json()) as { data: ScoreEntry[] };
  assert.equal(after.data[0].technical_winner_points, 0);
  assert.equal(after.data[0].total_points, 23);
  assert.equal(after.data[0].correct_predictions, 3);
});

test("GET /leagues/:id/standings sums scores across weeks", async () => {
  const owner = await registerAndLogin(
    "Standings Owner",
    "standings-owner@example.com",
  );
  const league = await createLeague(owner.token, "Standings League");

  const deadline = new Date(Date.now() + 1200).toISOString();
  const weekA = await createWeek(
    adminToken,
    962,
    "Standings Week A",
    defaultSeasonId,
    deadline,
  );
  const weekB = await createWeek(
    adminToken,
    963,
    "Standings Week B",
    defaultSeasonId,
    deadline,
  );

  const contestantIdsA: number[] = [];
  for (const name of ["Standings A One", "Standings A Two", "Standings A Three", "Standings A Four"]) {
    contestantIdsA.push((await createContestant(adminToken, name)).id);
  }
  const contestantIdsB: number[] = [];
  for (const name of ["Standings B One", "Standings B Two", "Standings B Three", "Standings B Four"]) {
    contestantIdsB.push((await createContestant(adminToken, name)).id);
  }
  const [a1, a2, a3, a4] = contestantIdsA;
  const [b1, b2, b3, b4] = contestantIdsB;
  const picksA = { star_baker: a1, technical_winner: a2, eliminated: a3, weekly_special: a4 };
  const picksB = { star_baker: b1, technical_winner: b2, eliminated: b3, weekly_special: b4 };

  await submitPrediction(owner.token, league.id, weekA.id, picksA);
  await submitPrediction(owner.token, league.id, weekB.id, picksB);

  await new Promise((resolve) => setTimeout(resolve, 1500));

  const firstPublish = await postJson(
    "/results",
    { week: weekA.id, ...picksA },
    adminToken,
  );
  assert.equal(firstPublish.status, 201);
  const secondPublish = await postJson(
    "/results",
    { week: weekB.id, ...picksB },
    adminToken,
  );
  assert.equal(secondPublish.status, 201);

  const standingsResponse = await getJson(
    `/leagues/${league.id}/standings`,
    owner.token,
  );
  assert.equal(standingsResponse.status, 200);
  const standings = (await standingsResponse.json()) as { data: ScoreEntry[] };
  assert.equal(standings.data.length, 1);
  assert.equal(standings.data[0].total_points, 56);
  assert.equal(standings.data[0].correct_predictions, 8);
  assert.equal(standings.data[0].rank, 1);
});

test("standings share rank on a tie and skip the next rank", async () => {
  const owner = await registerAndLogin("Tie Owner", "tie-owner@example.com");
  const memberA = await registerAndLogin("Tie Member A", "tie-member-a@example.com");
  const memberB = await registerAndLogin("Tie Member B", "tie-member-b@example.com");
  const league = await createLeague(owner.token, "Tie League");
  for (const member of [memberA, memberB]) {
    await postJson(
      "/leagues/join",
      { invite_code: league.invite_code },
      member.token,
    );
  }

  const deadline = new Date(Date.now() + 1200).toISOString();
  const week = await createWeek(
    adminToken,
    964,
    "Tie Week",
    defaultSeasonId,
    deadline,
  );
  const contestantIds: number[] = [];
  for (const name of ["Tie One", "Tie Two", "Tie Three", "Tie Four", "Tie Five"]) {
    contestantIds.push((await createContestant(adminToken, name)).id);
  }
  const [c1, c2, c3, c4, c5] = contestantIds;
  const correctPicks = { star_baker: c1, technical_winner: c2, eliminated: c3, weekly_special: c4 };
  const wrongPicks = { star_baker: c5, technical_winner: c5, eliminated: c5, weekly_special: c5 };

  await submitPrediction(owner.token, league.id, week.id, correctPicks);
  await submitPrediction(memberA.token, league.id, week.id, correctPicks);
  await submitPrediction(memberB.token, league.id, week.id, wrongPicks);

  await new Promise((resolve) => setTimeout(resolve, 1500));
  await publishResult(adminToken, week.id, correctPicks);

  const response = await getJson(
    `/leagues/${league.id}/standings`,
    owner.token,
  );
  const standings = (await response.json()) as { data: ScoreEntry[] };
  const ranksByUser = new Map(standings.data.map((entry) => [entry.user_id, entry.rank]));
  assert.equal(ranksByUser.get(owner.user.id), 1);
  assert.equal(ranksByUser.get(memberA.user.id), 1);
  assert.equal(ranksByUser.get(memberB.user.id), 3);
});

test("a member with no prediction scores zero and still appears in standings", async () => {
  const owner = await registerAndLogin(
    "Missing Owner",
    "missing-owner@example.com",
  );
  const silentMember = await registerAndLogin(
    "Silent Member",
    "silent-member@example.com",
  );
  const league = await createLeague(owner.token, "Missing League");
  await postJson(
    "/leagues/join",
    { invite_code: league.invite_code },
    silentMember.token,
  );

  const deadline = new Date(Date.now() + 1200).toISOString();
  const week = await createWeek(
    adminToken,
    965,
    "Missing Week",
    defaultSeasonId,
    deadline,
  );
  const contestantIds: number[] = [];
  for (const name of ["Missing One", "Missing Two", "Missing Three", "Missing Four"]) {
    contestantIds.push((await createContestant(adminToken, name)).id);
  }
  const [c1, c2, c3, c4] = contestantIds;
  const picks = { star_baker: c1, technical_winner: c2, eliminated: c3, weekly_special: c4 };
  await submitPrediction(owner.token, league.id, week.id, picks);

  await new Promise((resolve) => setTimeout(resolve, 1500));
  await publishResult(adminToken, week.id, picks);

  const standingsResponse = await getJson(
    `/leagues/${league.id}/standings`,
    owner.token,
  );
  const standings = (await standingsResponse.json()) as { data: ScoreEntry[] };
  const silentEntry = standings.data.find(
    (entry) => entry.user_id === silentMember.user.id,
  )!;
  assert.equal(silentEntry.total_points, 0);
  assert.equal(silentEntry.correct_predictions, 0);
  assert.equal(silentEntry.rank, 2);
});

test("moving a result to a different week clears the old week's scores", async () => {
  const owner = await registerAndLogin("Move Owner", "move-owner@example.com");
  const league = await createLeague(owner.token, "Move League");

  const deadline = new Date(Date.now() + 1200).toISOString();
  const weekA = await createWeek(adminToken, 966, "Move Week A", defaultSeasonId, deadline);
  const weekB = await createWeek(adminToken, 967, "Move Week B", defaultSeasonId, deadline);

  const contestantIds: number[] = [];
  for (const name of ["Move One", "Move Two", "Move Three", "Move Four"]) {
    contestantIds.push((await createContestant(adminToken, name)).id);
  }
  const [c1, c2, c3, c4] = contestantIds;
  const picks = { star_baker: c1, technical_winner: c2, eliminated: c3, weekly_special: c4 };

  await submitPrediction(owner.token, league.id, weekA.id, picks);
  await submitPrediction(owner.token, league.id, weekB.id, picks);

  await new Promise((resolve) => setTimeout(resolve, 1500));

  const result = await publishResult(adminToken, weekA.id, picks);

  const beforeMove = (await (
    await getJson(`/leagues/${league.id}/weeks/${weekA.id}/scores`, owner.token)
  ).json()) as { data: ScoreEntry[] };
  assert.equal(beforeMove.data[0].total_points, 28);

  const moveResponse = await patchJson(
    `/results/${result.id}`,
    { week: weekB.id },
    adminToken,
  );
  assert.equal(moveResponse.status, 200);

  const weekAAfter = (await (
    await getJson(`/leagues/${league.id}/weeks/${weekA.id}/scores`, owner.token)
  ).json()) as { data: ScoreEntry[] };
  assert.equal(weekAAfter.data[0].total_points, 0);

  const weekBAfter = (await (
    await getJson(`/leagues/${league.id}/weeks/${weekB.id}/scores`, owner.token)
  ).json()) as { data: ScoreEntry[] };
  assert.equal(weekBAfter.data[0].total_points, 28);
});

test("non-members cannot view standings or weekly scores", async () => {
  const owner = await registerAndLogin(
    "Standings Private Owner",
    "standings-private-owner@example.com",
  );
  const stranger = await registerAndLogin(
    "Standings Stranger",
    "standings-stranger@example.com",
  );
  const league = await createLeague(owner.token, "Standings Private League");
  const week = await createWeek(adminToken, 968, "Standings Private Week");

  const standingsResponse = await getJson(
    `/leagues/${league.id}/standings`,
    stranger.token,
  );
  assert.equal(standingsResponse.status, 403);

  const scoresResponse = await getJson(
    `/leagues/${league.id}/weeks/${week.id}/scores`,
    stranger.token,
  );
  assert.equal(scoresResponse.status, 403);
});

test("archived league standings remain readable", async () => {
  const owner = await registerAndLogin(
    "Archived Standings Owner",
    "archived-standings-owner@example.com",
  );
  const league = await createLeague(owner.token, "Archived Standings League");

  const deadline = new Date(Date.now() + 1200).toISOString();
  const week = await createWeek(
    adminToken,
    969,
    "Archived Standings Week",
    defaultSeasonId,
    deadline,
  );
  const contestantIds: number[] = [];
  for (const name of ["Archived One", "Archived Two", "Archived Three", "Archived Four"]) {
    contestantIds.push((await createContestant(adminToken, name)).id);
  }
  const [c1, c2, c3, c4] = contestantIds;
  const picks = { star_baker: c1, technical_winner: c2, eliminated: c3, weekly_special: c4 };
  await submitPrediction(owner.token, league.id, week.id, picks);

  await new Promise((resolve) => setTimeout(resolve, 1500));
  await publishResult(adminToken, week.id, picks);

  await deleteJson(`/leagues/${league.id}`, owner.token);

  const standingsResponse = await getJson(
    `/leagues/${league.id}/standings`,
    owner.token,
  );
  assert.equal(standingsResponse.status, 200);
  const standings = (await standingsResponse.json()) as { data: ScoreEntry[] };
  assert.equal(standings.data[0].total_points, 28);
});

test("unknown routes return 404 when authenticated", async () => {
  const response = await getJson("/missing", adminToken);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), errorBody("NOT_FOUND", "Not found"));
});

test("unknown routes require authentication too", async () => {
  const response = await getJson("/missing");

  assert.equal(response.status, 401);
});
