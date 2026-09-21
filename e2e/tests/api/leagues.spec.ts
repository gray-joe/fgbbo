import { expect, test } from "../../fixtures";
import {
  createLeague,
  createSeason,
  joinLeague,
  newUser,
  picks,
  publishResult,
  standings,
  submitPrediction,
} from "../../api/world";

// SPEC §2 League owner / League member, §3 League, §4 Archived leagues

test.describe("leagues and membership", () => {
  test("creating a league makes the caller its owner and first member", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const ada = await newUser("ada");
    const league = await createLeague(ada, season, "Ada's league");

    expect(league).toMatchObject({ name: "Ada's league", owner: ada.id, season_id: season.id, archived_at: null });
    expect(league.invite_code).toBeTruthy();
    const players = await ada.api.get(`/leagues/${league.id}/players`);
    expect(players.body.data.map((p: { user_id: number }) => p.user_id)).toEqual([ada.id]);
  });

  test("a league needs a name and an existing season", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const ada = await newUser("ada");
    expect((await ada.api.post("/leagues", { name: "  ", season_id: season.id })).status).toBe(400);
    expect((await ada.api.post("/leagues", { name: "Ghost", season_id: 999999 })).status).toBe(404);
  });

  test("a user joins with the invite code, and the code can be reused by others", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const ada = await newUser("ada");
    const bo = await newUser("bo");
    const cy = await newUser("cy");
    const league = await createLeague(ada, season);

    expect((await bo.api.post("/leagues/join", { invite_code: league.invite_code })).status).toBe(201);
    expect((await cy.api.post("/leagues/join", { invite_code: league.invite_code })).status).toBe(201);

    const again = await bo.api.post("/leagues/join", { invite_code: league.invite_code });
    expect(again.status).toBe(409);
    expect((await bo.api.post("/leagues/join", { invite_code: "nonsense" })).status).toBe(404);

    const players = await ada.api.get(`/leagues/${league.id}/players`);
    expect(players.body.data).toHaveLength(3);
  });

  test("only the owner and admins can see the invite code", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const ada = await newUser("ada");
    const bo = await newUser("bo");
    const league = await createLeague(ada, season);
    await joinLeague(bo, league.invite_code);

    expect((await ada.api.get(`/leagues/${league.id}`)).body.invite_code).toBe(league.invite_code);
    expect((await admin.api.get(`/leagues/${league.id}`)).body.invite_code).toBe(league.invite_code);
    const asMember = await bo.api.get(`/leagues/${league.id}`);
    expect(asMember.status).toBe(200);
    expect(asMember.body.invite_code).toBeNull();
  });

  test("rotating the invite code stops the old code working immediately", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const ada = await newUser("ada");
    const bo = await newUser("bo");
    const cy = await newUser("cy");
    const league = await createLeague(ada, season);
    await joinLeague(bo, league.invite_code);

    expect((await bo.api.post(`/leagues/${league.id}/invite-code`)).status).toBe(403);
    const rotated = await ada.api.post(`/leagues/${league.id}/invite-code`);
    expect(rotated.status).toBe(200);
    expect(rotated.body.invite_code).not.toBe(league.invite_code);

    expect((await cy.api.post("/leagues/join", { invite_code: league.invite_code })).status).toBe(404);
    expect((await cy.api.post("/leagues/join", { invite_code: rotated.body.invite_code })).status).toBe(201);
  });

  test("only members (and admins) can see a league's data", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const ada = await newUser("ada");
    const outsider = await newUser("outsider");
    const league = await createLeague(ada, season);
    const weekId = season.weeks[0].id;

    const paths = [
      `/leagues/${league.id}`,
      `/leagues/${league.id}/players`,
      `/leagues/${league.id}/standings`,
      `/leagues/${league.id}/weeks/${weekId}/scores`,
      `/leagues/${league.id}/predictions`,
    ];
    for (const path of paths) {
      expect((await outsider.api.get(path)).status, path).toBe(403);
      expect((await ada.api.get(path)).status, path).toBe(200);
      expect((await admin.api.get(path)).status, path).toBe(200);
    }
  });

  test("a user can be in many leagues and only sees their own", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const ada = await newUser("ada");
    const bo = await newUser("bo");
    const mine = await createLeague(ada, season, "Mine");
    const other = await createLeague(bo, season, "Other");
    await joinLeague(ada, other.invite_code);
    const lonely = await createLeague(bo, season, "Bo only");

    const listed = (await ada.api.list("/leagues")).map((l) => l.id);
    expect(listed).toEqual(expect.arrayContaining([mine.id, other.id]));
    expect(listed).not.toContain(lonely.id);
  });

  test("a user's leagues fill the first page however many other leagues exist", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const other = await newUser("other");
    for (let i = 0; i < 21; i++) await createLeague(other, season, `Other ${i}`);
    const ada = await newUser("ada");
    const mine = await createLeague(ada, season, "Mine");

    const firstPage = await ada.api.get("/leagues");
    expect(firstPage.body.data.map((l: { id: number }) => l.id)).toEqual([mine.id]);
    expect(firstPage.body.pagination.next_cursor).toBeNull();
  });

  test("owners add and remove members; members can only leave", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const ada = await newUser("ada");
    const bo = await newUser("bo");
    const cy = await newUser("cy");
    const dee = await newUser("dee");
    const league = await createLeague(ada, season);

    expect((await ada.api.post(`/leagues/${league.id}/players`, { user_id: bo.id })).status).toBe(201);
    expect((await ada.api.post(`/leagues/${league.id}/players`, { user_id: bo.id })).status).toBe(409);
    await joinLeague(cy, league.invite_code);

    expect((await bo.api.post(`/leagues/${league.id}/players`, { user_id: dee.id })).status).toBe(403);
    expect((await bo.api.delete(`/leagues/${league.id}/players/${cy.id}`)).status).toBe(403);
    expect((await ada.api.delete(`/leagues/${league.id}/players/${cy.id}`)).status).toBe(204);
    expect((await bo.api.delete(`/leagues/${league.id}/players/${bo.id}`)).status).toBe(204);
    expect((await ada.api.get(`/leagues/${league.id}`)).status).toBe(200);
    expect((await bo.api.get(`/leagues/${league.id}`)).status).toBe(403);
  });

  test("an owner must transfer ownership before leaving", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const ada = await newUser("ada");
    const bo = await newUser("bo");
    const outsider = await newUser("outsider");
    const league = await createLeague(ada, season);
    await joinLeague(bo, league.invite_code);

    expect((await ada.api.delete(`/leagues/${league.id}/players/${ada.id}`)).status).toBe(409);
    const toOutsider = await ada.api.patch(`/leagues/${league.id}`, { owner: outsider.id });
    expect(toOutsider.status).toBe(409);
    expect((await bo.api.patch(`/leagues/${league.id}`, { owner: bo.id })).status).toBe(403);

    const transferred = await ada.api.patch(`/leagues/${league.id}`, { owner: bo.id });
    expect(transferred.status).toBe(200);
    expect(transferred.body.owner).toBe(bo.id);
    expect((await ada.api.delete(`/leagues/${league.id}/players/${ada.id}`)).status).toBe(204);
    expect((await bo.api.get(`/leagues/${league.id}`)).body.invite_code).toBeTruthy();
  });

  test("owners can rename a league; members can't", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const ada = await newUser("ada");
    const bo = await newUser("bo");
    const league = await createLeague(ada, season, "Before");
    await joinLeague(bo, league.invite_code);

    expect((await bo.api.patch(`/leagues/${league.id}`, { name: "Hijack" })).status).toBe(403);
    const renamed = await ada.api.patch(`/leagues/${league.id}`, { name: "After" });
    expect(renamed.body.name).toBe("After");
  });

  test.describe("archiving", () => {
    test("only the owner archives a league, and only once", async ({ admin }) => {
      const season = await createSeason(admin, 1);
      const ada = await newUser("ada");
      const bo = await newUser("bo");
      const league = await createLeague(ada, season);
      await joinLeague(bo, league.invite_code);

      expect((await bo.api.delete(`/leagues/${league.id}`)).status).toBe(403);
      expect((await ada.api.delete(`/leagues/${league.id}`)).status).toBe(204);
      expect((await ada.api.delete(`/leagues/${league.id}`)).status).toBe(409);
      expect((await ada.api.get(`/leagues/${league.id}`)).body.archived_at).toBeTruthy();
    });

    test("an archived league keeps its history but is read-only", async ({ admin }) => {
      const season = await createSeason(admin, 1);
      const weekId = season.weeks[0].id;
      const ada = await newUser("ada");
      const bo = await newUser("bo");
      const cy = await newUser("cy");
      const league = await createLeague(ada, season);
      await joinLeague(bo, league.invite_code);
      const perfect = picks(season, "Alex", "Bo", "Casey", "Dana");
      await submitPrediction(bo, weekId, perfect);
      await publishResult(admin, weekId, perfect);
      await ada.api.must("DELETE", `/leagues/${league.id}`);

      // History is still readable.
      const rows = await standings(ada, league.id);
      expect(rows.find((row) => row.user_id === bo.id)).toMatchObject({ total_points: 28, rank: 1 });
      expect((await ada.api.get(`/leagues/${league.id}/players`)).body.data).toHaveLength(2);
      expect((await ada.api.get(`/leagues/${league.id}/weeks/${weekId}/scores`)).status).toBe(200);

      // Nothing about the league can change.
      const blocked = [
        ada.api.patch(`/leagues/${league.id}`, { name: "Renamed" }),
        ada.api.post(`/leagues/${league.id}/invite-code`),
        ada.api.post(`/leagues/${league.id}/players`, { user_id: cy.id }),
        bo.api.delete(`/leagues/${league.id}/players/${bo.id}`),
        cy.api.post("/leagues/join", { invite_code: league.invite_code }),
        bo.api.post(`/leagues/${league.id}/predictions`, { week_id: weekId, ...perfect }),
        bo.api.patch(`/leagues/${league.id}/weeks/${weekId}/prediction`, { star_baker: season.bakers.Bo }),
      ];
      for (const response of await Promise.all(blocked)) {
        expect(response.status).toBe(409);
      }
      expect((await ada.api.get(`/leagues/${league.id}`)).body.name).not.toBe("Renamed");
    });

    test("a user's prediction can still be made outside an archived league", async ({ admin }) => {
      const season = await createSeason(admin, 1);
      const weekId = season.weeks[0].id;
      const ada = await newUser("ada");
      const league = await createLeague(ada, season);
      await ada.api.must("DELETE", `/leagues/${league.id}`);

      const direct = await submitPrediction(ada, weekId, picks(season, "Alex", "Bo", "Casey", "Dana"));
      expect(direct.status).toBe(201);
      const edited = await ada.api.patch(`/weeks/${weekId}/prediction`, { star_baker: season.bakers.Bo });
      expect(edited.status).toBe(200);
    });
  });
});
