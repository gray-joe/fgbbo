import { expect, test } from "../../fixtures";
import { Api } from "../../api/client";
import {
  createLeague,
  createSeason,
  daysFromNow,
  joinLeague,
  newUser,
  picks,
  publishResult,
  submitPrediction,
  type TestUser,
} from "../../api/world";
import { ADMIN_EMAIL } from "../../support/env";

// SPEC §4 Audit trail: administrative and scoring changes are recorded

interface Entry {
  id: number;
  at: string;
  actor_id: number;
  actor_email: string;
  method: string;
  path: string;
  action: string;
  entity: string;
  entity_id: number | null;
  status: number;
  body?: unknown;
}

/** What the log says happened to one thing, oldest first. */
async function history(admin: TestUser, entity: string, id: number) {
  const page = await admin.api.get(`/audit-log?entity=${entity}&entity_id=${id}&limit=100`);
  expect(page.status).toBe(200);
  return (page.body.data as Entry[]).reverse();
}

const actions = (entries: Entry[]) => entries.map((entry) => entry.action);

const newestId = async (admin: TestUser) =>
  ((await admin.api.get("/audit-log?limit=1")).body.data as Entry[])[0]?.id ?? 0;

test.describe("audit trail", () => {
  test("every change to official data is recorded with who did it and what was sent", async ({ admin }) => {
    const season = await admin.api.must("POST", "/seasons", { name: "Audited", active: false });
    await admin.api.must("PATCH", `/seasons/${season.id}`, { name: "Audited again" });
    const baker = await admin.api.must("POST", "/contestants", { name: "Zed", eliminated: false, season_id: season.id });
    await admin.api.must("PATCH", `/contestants/${baker.id}`, { name: "Zed II" });
    const week = await admin.api.must("POST", "/weeks", {
      number: 1,
      theme: "Bread",
      season_id: season.id,
      prediction_deadline: daysFromNow(3),
    });
    await admin.api.must("PATCH", `/weeks/${week.id}`, { theme: "Sourdough" });
    await admin.api.must("DELETE", `/weeks/${week.id}`);
    await admin.api.must("DELETE", `/contestants/${baker.id}`);

    const seasonLog = await history(admin, "seasons", season.id);
    expect(seasonLog.map((e) => [e.action, e.body])).toEqual([
      ["seasons.create", { name: "Audited", active: false }],
      ["seasons.update", { name: "Audited again" }],
    ]);
    expect(seasonLog[0]).toMatchObject({
      actor_id: admin.id,
      actor_email: ADMIN_EMAIL,
      method: "POST",
      path: "/seasons",
      status: 201,
      entity: "seasons",
    });
    expect(Date.now() - new Date(seasonLog[0].at).getTime()).toBeLessThan(60_000);
    expect(seasonLog[1]).toMatchObject({ method: "PATCH", path: `/seasons/${season.id}`, status: 200 });

    const bakerLog = await history(admin, "contestants", baker.id);
    expect(actions(bakerLog)).toEqual(["contestants.create", "contestants.update", "contestants.delete"]);
    expect(bakerLog[2]).toMatchObject({ method: "DELETE", status: 204 });
    expect(bakerLog[2].body).toBeUndefined();

    const weekLog = await history(admin, "weeks", week.id);
    expect(weekLog.map((e) => [e.action, (e.body as { theme?: string } | undefined)?.theme])).toEqual([
      ["weeks.create", "Bread"],
      ["weeks.update", "Sourdough"],
      ["weeks.delete", undefined],
    ]);
  });

  test("scoring changes are recorded: publishing, correcting, and deleting a result", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const weekId = season.weeks[0].id;
    const result = picks(season, "Alex", "Bo", "Casey", "Dana");
    const published = await publishResult(admin, weekId, result);
    await admin.api.must("PATCH", `/results/${published.body.id}`, { star_baker: season.bakers.Bo });
    await admin.api.must("DELETE", `/results/${published.body.id}`);

    const log = await history(admin, "results", published.body.id);
    expect(log.map((e) => [e.action, e.body])).toEqual([
      ["results.create", { week: weekId, ...result }],
      ["results.update", { star_baker: season.bakers.Bo }],
      ["results.delete", undefined],
    ]);
  });

  test("an admin acting on users and leagues is recorded", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const owner = await newUser("owner");
    const extra = await newUser("extra");
    const league = await createLeague(owner, season);

    await admin.api.must("PATCH", `/users/${owner.id}`, { name: "Renamed by admin" });
    await admin.api.must("PATCH", `/leagues/${league.id}`, { name: "Renamed league" });
    await admin.api.must("POST", `/leagues/${league.id}/invite-code`);
    await admin.api.must("POST", `/leagues/${league.id}/players`, { user_id: extra.id });
    await admin.api.must("DELETE", `/leagues/${league.id}/players/${extra.id}`);
    await admin.api.must("DELETE", `/leagues/${league.id}`);

    expect(actions(await history(admin, "users", owner.id))).toEqual(["users.update"]);
    const leagueLog = await history(admin, "leagues", league.id);
    expect(actions(leagueLog)).toEqual([
      "leagues.update",
      "leagues.rotate_invite_code",
      "leagues.add_player",
      "leagues.remove_player",
      "leagues.delete",
    ]);
    expect(leagueLog[2].body).toEqual({ user_id: extra.id });
    expect(leagueLog[3].path).toBe(`/leagues/${league.id}/players/${extra.id}`);
  });

  test("routine activity is not recorded, for members or for admins", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const weekId = season.weeks[0].id;
    const before = await newestId(admin);

    const ada = await newUser("ada");
    const bo = await newUser("bo");
    const league = await createLeague(ada, season);
    await joinLeague(bo, league.invite_code);
    await submitPrediction(ada, weekId, picks(season, "Alex", "Bo", "Casey", "Dana"));
    await ada.api.must("PATCH", `/weeks/${weekId}/prediction`, { star_baker: season.bakers.Bo });
    await ada.api.must("PATCH", `/users/${ada.id}`, { name: "Ada L" });
    await ada.api.must("POST", `/leagues/${league.id}/invite-code`);
    await ada.api.must("DELETE", `/auth/logout`);
    // An admin doing ordinary things is not moderating.
    await submitPrediction(admin, weekId, picks(season, "Alex", "Bo", "Casey", "Dana"));
    const adminLeague = await createLeague(admin, season);
    await joinLeague(bo, adminLeague.invite_code);

    expect(await newestId(admin)).toBe(before);
  });

  test("failed requests are not recorded", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const weekId = season.weeks[0].id;
    const member = await newUser("member");
    const result = picks(season, "Alex", "Bo", "Casey", "Dana");
    await publishResult(admin, weekId, result);
    const before = await newestId(admin);

    const attempts = [
      publishResult(admin, weekId, result), // 409 duplicate
      admin.api.post("/weeks", { number: 5, theme: "No deadline", season_id: season.id }), // 400
      admin.api.patch("/contestants/999999", { name: "Ghost" }), // 404
      admin.api.delete(`/weeks/${weekId}`), // 409, has a result
      member.api.post("/seasons", { name: "Nope", active: false }), // 403
    ];
    expect((await Promise.all(attempts)).map((r) => r.status)).toEqual([409, 400, 404, 409, 403]);

    expect(await newestId(admin)).toBe(before);
  });

  test("only administrators can read the log, and nobody can change it", async ({ admin }) => {
    const member = await newUser("member");
    expect((await member.api.get("/audit-log")).status).toBe(403);
    expect((await new Api().get("/audit-log")).status).toBe(401);

    const before = await newestId(admin);
    expect(before).toBeGreaterThan(0);
    for (const attempt of [
      admin.api.post("/audit-log", { action: "fake" }),
      admin.api.patch("/audit-log", { action: "fake" }),
      admin.api.delete("/audit-log"),
      admin.api.delete(`/audit-log/${before}`),
      admin.api.patch(`/audit-log/${before}`, { action: "fake" }),
    ]) {
      expect((await attempt).status).toBe(404);
    }
    expect(await newestId(admin)).toBe(before);
    const kept = (await admin.api.get("/audit-log?limit=1")).body.data[0];
    expect(kept.action).not.toBe("fake");
  });

  test("the log is newest first, and can be paged and filtered", async ({ admin }) => {
    const season = await admin.api.must("POST", "/seasons", { name: "Paged", active: false });
    for (const name of ["One", "Two", "Three"]) {
      await admin.api.must("PATCH", `/seasons/${season.id}`, { name });
    }
    const path = `/audit-log?entity=seasons&entity_id=${season.id}`;

    const first = await admin.api.get(`${path}&limit=2`);
    const firstIds = first.body.data.map((e: Entry) => e.id);
    expect(first.body.data.map((e: Entry) => (e.body as { name?: string }).name)).toEqual(["Three", "Two"]);
    expect(firstIds[0]).toBeGreaterThan(firstIds[1]);
    expect(first.body.pagination.next_cursor).toBe(firstIds[1]);

    const second = await admin.api.get(`${path}&limit=2&cursor=${first.body.pagination.next_cursor}`);
    expect(second.body.data.map((e: Entry) => e.action)).toEqual(["seasons.update", "seasons.create"]);
    expect(second.body.pagination.next_cursor).toBeNull();

    const mine = await admin.api.get(`/audit-log?actor_id=${admin.id}&limit=5`);
    expect(mine.body.data.length).toBeGreaterThan(0);
    expect(mine.body.data.every((e: Entry) => e.actor_id === admin.id)).toBe(true);
    const nobody = await admin.api.get("/audit-log?actor_id=999999");
    expect(nobody.body.data).toEqual([]);
  });

  test("bad filters are rejected", async ({ admin }) => {
    for (const query of ["entity=bogus", "limit=0", "entity_id=abc", "actor_id=-1"]) {
      expect((await admin.api.get(`/audit-log?${query}`)).status, query).toBe(400);
    }
  });
});
