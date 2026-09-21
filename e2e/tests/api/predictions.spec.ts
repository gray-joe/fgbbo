import { expect, test } from "../../fixtures";
import {
  createLeague,
  createSeason,
  joinLeague,
  lockWeek,
  newUser,
  picks,
  publishResult,
  submitPrediction,
} from "../../api/world";

// SPEC §2 (any signed-in user), §3 Prediction, §4 Predictions

test.describe("predictions", () => {
  test("a signed-in user needs no league to create, read, and repeatedly edit a prediction", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const weekId = season.weeks[0].id;
    const ada = await newUser("ada");

    expect((await ada.api.get(`/weeks/${weekId}/prediction`)).status).toBe(404);
    const created = await submitPrediction(ada, weekId, picks(season, "Alex", "Bo", "Casey", "Dana"));
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ user_id: ada.id, week_id: weekId, star_baker: season.bakers.Alex });

    for (const baker of ["Bo", "Casey", "Dana"] as const) {
      const edited = await ada.api.patch(`/weeks/${weekId}/prediction`, { star_baker: season.bakers[baker] });
      expect(edited.status).toBe(200);
    }
    const read = await ada.api.get(`/weeks/${weekId}/prediction`);
    expect(read.body).toMatchObject({ id: created.body.id, star_baker: season.bakers.Dana });
  });

  test("all four picks are required", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const ada = await newUser("ada");
    const { weekly_special: _omitted, ...three } = picks(season, "Alex", "Bo", "Casey", "Dana");
    const response = await ada.api.post("/predictions", { week_id: season.weeks[0].id, ...three });
    expect(response.status).toBe(400);
  });

  test("a user has one prediction per week", async ({ admin }) => {
    const season = await createSeason(admin, 2);
    const ada = await newUser("ada");
    const p = picks(season, "Alex", "Bo", "Casey", "Dana");

    expect((await submitPrediction(ada, season.weeks[0].id, p)).status).toBe(201);
    const second = await submitPrediction(ada, season.weeks[0].id, p);
    expect(second.status).toBe(409);
    expect((await submitPrediction(ada, season.weeks[1].id, p)).status).toBe(201);
  });

  test("an eliminated baker can't be picked", async ({ admin }) => {
    const season = await createSeason(admin, 2);
    await publishResult(admin, season.weeks[0].id, picks(season, "Alex", "Bo", "Casey", "Dana"));
    const ada = await newUser("ada");

    const response = await submitPrediction(ada, season.weeks[1].id, picks(season, "Casey", "Bo", "Elliot", "Dana"));
    expect(response.status).toBe(409);
    const ok = await submitPrediction(ada, season.weeks[1].id, picks(season, "Alex", "Bo", "Elliot", "Dana"));
    expect(ok.status).toBe(201);
  });

  test("predictions lock at the deadline: late creates and edits are rejected", async ({ admin }) => {
    const season = await createSeason(admin, 2);
    const [early, late] = season.weeks;
    const ada = await newUser("ada");
    const p = picks(season, "Alex", "Bo", "Casey", "Dana");
    await submitPrediction(ada, early.id, p);

    await lockWeek(admin, early.id);
    await lockWeek(admin, late.id);

    const edit = await ada.api.patch(`/weeks/${early.id}/prediction`, { star_baker: season.bakers.Bo });
    expect(edit.status).toBe(409);
    expect(edit.body.error.code).toBe("PREDICTION_LOCKED");
    const create = await submitPrediction(ada, late.id, p);
    expect(create.status).toBe(409);
    expect(create.body.error.code).toBe("PREDICTION_LOCKED");

    const kept = await ada.api.get(`/weeks/${early.id}/prediction`);
    expect(kept.body.star_baker).toBe(season.bakers.Alex);
  });

  test("picks can be changed right up to the deadline, and not once it passes", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const weekId = season.weeks[0].id;
    const ada = await newUser("ada");
    // A real deadline two seconds away, rather than one moved by hand.
    const deadline = Date.now() + 2000;
    await admin.api.must("PATCH", `/weeks/${weekId}`, { prediction_deadline: new Date(deadline).toISOString() });

    expect((await submitPrediction(ada, weekId, picks(season, "Alex", "Bo", "Casey", "Dana"))).status).toBe(201);
    const before = await ada.api.patch(`/weeks/${weekId}/prediction`, { star_baker: season.bakers.Bo });
    expect(before.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, deadline - Date.now() + 100));
    const after = await ada.api.patch(`/weeks/${weekId}/prediction`, { star_baker: season.bakers.Dana });
    expect(after.status).toBe(409);
    expect(after.body.error.code).toBe("PREDICTION_LOCKED");
  });

  test("publishing a result locks the week even if the deadline is still ahead", async ({ admin }) => {
    const season = await createSeason(admin, 1); // deadline is a week away
    const weekId = season.weeks[0].id;
    const ada = await newUser("ada");
    const late = await newUser("late");
    const league = await createLeague(ada, season);
    await joinLeague(late, league.invite_code);
    await submitPrediction(ada, weekId, picks(season, "Frankie", "Elliot", "Dana", "Bo"));
    const published = await publishResult(admin, weekId, picks(season, "Alex", "Bo", "Casey", "Dana"));

    const edit = await ada.api.patch(`/weeks/${weekId}/prediction`, { star_baker: season.bakers.Alex });
    expect(edit.status).toBe(409);
    expect(edit.body.error.code).toBe("PREDICTION_LOCKED");
    const p = picks(season, "Alex", "Bo", "Elliot", "Dana");
    const create = await submitPrediction(late, weekId, p);
    expect(create.status).toBe(409);
    expect(create.body.error.code).toBe("PREDICTION_LOCKED");
    const viaLeague = await late.api.post(`/leagues/${league.id}/predictions`, { week_id: weekId, ...p });
    expect(viaLeague.status).toBe(409);
    expect(
      (await ada.api.patch(`/leagues/${league.id}/weeks/${weekId}/prediction`, { star_baker: season.bakers.Alex })).status,
    ).toBe(409);

    // Removing a mistaken result reopens picks while the deadline is still ahead.
    await admin.api.must("DELETE", `/results/${published.body.id}`);
    expect((await submitPrediction(late, weekId, p)).status).toBe(201);
  });

  test("picks become visible to the league once a result locks the week", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const weekId = season.weeks[0].id;
    const ada = await newUser("ada");
    const bo = await newUser("bo");
    const league = await createLeague(ada, season);
    await joinLeague(bo, league.invite_code);
    await submitPrediction(ada, weekId, picks(season, "Alex", "Bo", "Casey", "Dana"));
    await submitPrediction(bo, weekId, picks(season, "Dana", "Casey", "Bo", "Alex"));
    const owners = async () =>
      (await bo.api.get(`/leagues/${league.id}/predictions?week_id=${weekId}`)).body.data.map(
        (row: { user_id: number }) => row.user_id,
      );

    expect(await owners()).toEqual([bo.id]);
    await publishResult(admin, weekId, picks(season, "Alex", "Bo", "Casey", "Dana"));
    expect((await owners()).sort()).toEqual([ada.id, bo.id].sort());
  });

  test("one prediction is shared by every league the user is in", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const weekId = season.weeks[0].id;
    const ada = await newUser("ada");
    const bo = await newUser("bo");
    const leagueA = await createLeague(ada, season, "A");
    const leagueB = await createLeague(bo, season, "B");
    await joinLeague(ada, leagueB.invite_code);

    const viaA = await ada.api.post(`/leagues/${leagueA.id}/predictions`, {
      week_id: weekId,
      ...picks(season, "Alex", "Bo", "Casey", "Dana"),
    });
    expect(viaA.status).toBe(201);

    const viaB = await ada.api.get(`/leagues/${leagueB.id}/weeks/${weekId}/prediction`);
    expect(viaB.body.id).toBe(viaA.body.id);
    await ada.api.must("PATCH", `/leagues/${leagueB.id}/weeks/${weekId}/prediction`, {
      star_baker: season.bakers.Dana,
    });
    const direct = await ada.api.get(`/weeks/${weekId}/prediction`);
    expect(direct.body).toMatchObject({ id: viaA.body.id, star_baker: season.bakers.Dana });
  });

  test("the league prediction routes require membership", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const weekId = season.weeks[0].id;
    const ada = await newUser("ada");
    const outsider = await newUser("outsider");
    const league = await createLeague(ada, season);
    const p = picks(season, "Alex", "Bo", "Casey", "Dana");

    const viaLeague = await outsider.api.post(`/leagues/${league.id}/predictions`, { week_id: weekId, ...p });
    expect(viaLeague.status).toBe(403);
    expect((await outsider.api.get(`/leagues/${league.id}/predictions`)).status).toBe(403);
    expect((await submitPrediction(outsider, weekId, p)).status).toBe(201);
  });

  test("picks are private until the deadline, then visible to the league", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const weekId = season.weeks[0].id;
    const ada = await newUser("ada");
    const bo = await newUser("bo");
    const league = await createLeague(ada, season);
    await joinLeague(bo, league.invite_code);
    await submitPrediction(ada, weekId, picks(season, "Alex", "Bo", "Casey", "Dana"));
    await submitPrediction(bo, weekId, picks(season, "Dana", "Casey", "Bo", "Alex"));

    const owners = async (user: typeof ada) =>
      (await user.api.get(`/leagues/${league.id}/predictions?week_id=${weekId}`)).body.data.map(
        (p: { user_id: number }) => p.user_id,
      );

    expect(await owners(ada)).toEqual([ada.id]);
    expect(await owners(bo)).toEqual([bo.id]);
    expect((await owners(admin)).sort()).toEqual([ada.id, bo.id].sort());

    await lockWeek(admin, weekId);
    expect((await owners(ada)).sort()).toEqual([ada.id, bo.id].sort());
    expect((await owners(bo)).sort()).toEqual([ada.id, bo.id].sort());
  });

  test("the league prediction list fills its page with what the caller can see", async ({ admin }) => {
    const season = await createSeason(admin, 21);
    const ada = await newUser("ada");
    const bo = await newUser("bo");
    const league = await createLeague(ada, season);
    await joinLeague(bo, league.invite_code);
    const p = picks(season, "Alex", "Bo", "Casey", "Dana");
    // Bo's 21 predictions are hidden from Ada until each deadline; hers comes last.
    for (const week of season.weeks) await submitPrediction(bo, week.id, p);
    await submitPrediction(ada, season.weeks[0].id, p);

    const page = await ada.api.get(`/leagues/${league.id}/predictions?limit=20`);
    expect(page.body.data.map((row: { user_id: number }) => row.user_id)).toEqual([ada.id]);
    expect(page.body.pagination.next_cursor).toBeNull();
  });

  test("an administrator can't file predictions on someone else's behalf", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const weekId = season.weeks[0].id;
    const ada = await newUser("ada");

    const response = await admin.api.post("/predictions", {
      week_id: weekId,
      user_id: ada.id,
      ...picks(season, "Alex", "Bo", "Casey", "Dana"),
    });
    expect(response.body.user_id).toBe(admin.id);
    expect((await ada.api.get(`/weeks/${weekId}/prediction`)).status).toBe(404);
    expect((await admin.api.patch(`/weeks/${weekId}/prediction`, { star_baker: season.bakers.Bo })).status).toBe(200);
    expect((await ada.api.get(`/weeks/${weekId}/prediction`)).status).toBe(404);
  });
});
