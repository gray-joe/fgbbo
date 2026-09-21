import { expect, test } from "../../fixtures";
import {
  createLeague,
  createSeason,
  daysFromNow,
  newUser,
  picks,
  publishResult,
} from "../../api/world";

// SPEC §2 System administrator, §3 Season / Contestant / Week

test.describe("official season data", () => {
  test("only administrators can manage seasons, contestants, weeks, and results", async ({ admin }) => {
    const member = await newUser("member");
    const season = await createSeason(admin, 1);
    const weekId = season.weeks[0].id;
    const result = picks(season, "Alex", "Bo", "Casey", "Dana");

    const attempts = [
      member.api.post("/seasons", { name: "Nope", active: false }),
      member.api.patch(`/seasons/${season.id}`, { name: "Nope" }),
      member.api.post("/contestants", { name: "Zed", eliminated: false, season_id: season.id }),
      member.api.patch(`/contestants/${season.bakers.Alex}`, { name: "Nope" }),
      member.api.delete(`/contestants/${season.bakers.Alex}`),
      member.api.post("/weeks", {
        number: 9,
        theme: "Nope",
        season_id: season.id,
        prediction_deadline: daysFromNow(1),
      }),
      member.api.patch(`/weeks/${weekId}`, { theme: "Nope" }),
      member.api.delete(`/weeks/${weekId}`),
      publishResult(member, weekId, result),
    ];
    for (const response of await Promise.all(attempts)) {
      expect(response.status).toBe(403);
    }
  });

  test("an administrator can create a season with its bakers and weeks", async ({ admin }) => {
    const season = await admin.api.post("/seasons", { name: "Series 99", active: false });
    expect(season.status).toBe(201);
    expect(season.body).toMatchObject({ name: "Series 99", active: false });

    const baker = await admin.api.post("/contestants", { name: "Alex", eliminated: false, season_id: season.body.id });
    expect(baker.status).toBe(201);
    expect(baker.body).toMatchObject({ season_id: season.body.id, eliminated: false });

    const week = await admin.api.post("/weeks", {
      number: 1,
      theme: "Cake Week",
      season_id: season.body.id,
      prediction_deadline: daysFromNow(2),
    });
    expect(week.status).toBe(201);
    expect(week.body).toMatchObject({ number: 1, theme: "Cake Week", season_id: season.body.id });
  });

  test("anyone signed in can read the season, its bakers, and its weeks", async ({ admin }) => {
    const member = await newUser("reader");
    const season = await createSeason(admin, 2);
    expect((await member.api.get(`/seasons/${season.id}`)).status).toBe(200);
    const bakers = await member.api.get(`/contestants?season_id=${season.id}`);
    expect(bakers.body.data.map((b: { name: string }) => b.name)).toEqual(
      expect.arrayContaining(Object.keys(season.bakers)),
    );
    const weeks = await member.api.get(`/weeks?season_id=${season.id}`);
    expect(weeks.body.data).toHaveLength(2);
  });

  test.describe("active season", () => {
    // Activating a season deactivates the seeded one the UI tests rely on.
    test.afterEach(async ({ admin, seed }) => {
      await admin.api.must("PATCH", `/seasons/${seed.season.id}`, { active: true });
    });

    test("only one season is active at a time", async ({ admin }) => {
      const first = await admin.api.must("POST", "/seasons", { name: "First", active: true });
      const second = await admin.api.must("POST", "/seasons", { name: "Second", active: true });

      expect((await admin.api.get(`/seasons/${first.id}`)).body.active).toBe(false);
      expect((await admin.api.get(`/seasons/${second.id}`)).body.active).toBe(true);
      const all = (await admin.api.get("/seasons?limit=100")).body.data;
      expect(all.filter((s: { active: boolean }) => s.active)).toHaveLength(1);
    });
  });

  test("seasons are never deleted, and ended seasons keep their data", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    expect((await admin.api.delete(`/seasons/${season.id}`)).status).toBe(404);

    await admin.api.must("PATCH", `/seasons/${season.id}`, { active: false });
    expect((await admin.api.get(`/seasons/${season.id}`)).status).toBe(200);
    const bakers = await admin.api.get(`/contestants?season_id=${season.id}`);
    expect(bakers.body.data).toHaveLength(6);
    expect((await admin.api.get(`/weeks?season_id=${season.id}`)).body.data).toHaveLength(1);
  });

  test("week numbers are unique within a season but can repeat across seasons", async ({ admin }) => {
    const one = await createSeason(admin, 1);
    const two = await createSeason(admin, 1);
    const week = (seasonId: number) => ({
      number: 1,
      theme: "Again",
      season_id: seasonId,
      prediction_deadline: daysFromNow(3),
    });

    expect((await admin.api.post("/weeks", week(one.id))).status).toBe(409);
    expect((await admin.api.post("/weeks", week(two.id))).status).toBe(409);
    const fresh = await createSeason(admin, 0);
    expect((await admin.api.post("/weeks", week(fresh.id))).status).toBe(201);
    expect((await admin.api.post("/weeks", { ...week(fresh.id), number: 0 })).status).toBe(400);
  });

  test("a week needs a theme and a prediction deadline", async ({ admin }) => {
    const season = await createSeason(admin, 0);
    const base = { number: 1, theme: "Bread", season_id: season.id };
    expect((await admin.api.post("/weeks", base)).status).toBe(400);
    expect(
      (await admin.api.post("/weeks", { ...base, theme: "  ", prediction_deadline: daysFromNow(1) })).status,
    ).toBe(400);
  });

  test("contestants are shared by every league in the season", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const ada = await newUser("ada");
    const bo = await newUser("bo");
    await createLeague(ada, season, "Ada's league");
    await createLeague(bo, season, "Bo's league");

    const seenByAda = (await ada.api.get(`/contestants?season_id=${season.id}`)).body.data;
    const seenByBo = (await bo.api.get(`/contestants?season_id=${season.id}`)).body.data;
    expect(seenByAda).toEqual(seenByBo);
    expect(seenByAda).toHaveLength(6);
  });

  test("a contestant can't be picked in a season they don't belong to", async ({ admin }) => {
    const one = await createSeason(admin, 1);
    const two = await createSeason(admin, 1);
    const ada = await newUser("ada");

    const response = await ada.api.post("/predictions", {
      week_id: one.weeks[0].id,
      ...picks(two, "Alex", "Bo", "Casey", "Dana"),
    });
    expect(response.status).toBe(400);
  });
});
