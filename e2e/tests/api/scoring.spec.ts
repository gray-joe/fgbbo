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
  type SeasonFixture,
  type StandingRow,
  type TestUser,
} from "../../api/world";

// SPEC §3 Official result, §4 Official results / Scoring / Standings

const RESULT = ["Alex", "Bo", "Casey", "Dana"] as const; // star, technical, eliminated, special

async function leagueWith(admin: TestUser, season: SeasonFixture, count: number) {
  const owner = await newUser("owner");
  const league = await createLeague(owner, season);
  const members = [owner];
  for (let i = 1; i < count; i++) {
    const member = await newUser("member");
    await joinLeague(member, league.invite_code);
    members.push(member);
  }
  return { league, members };
}

const rowFor = (rows: StandingRow[], user: TestUser) => rows.find((row) => row.user_id === user.id)!;

test.describe("official results", () => {
  test("only administrators can publish results", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const member = await newUser("member");
    const response = await publishResult(member, season.weeks[0].id, picks(season, ...RESULT));
    expect(response.status).toBe(403);
  });

  test("a week has exactly one result", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const p = picks(season, ...RESULT);
    expect((await publishResult(admin, season.weeks[0].id, p)).status).toBe(201);
    expect((await publishResult(admin, season.weeks[0].id, p)).status).toBe(409);
  });

  test("a result can't use a baker from another season", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const other = await createSeason(admin, 1);
    const response = await publishResult(admin, season.weeks[0].id, picks(other, ...RESULT));
    expect(response.status).toBe(400);
  });

  test("publishing eliminates that baker, and an eliminated baker can't appear in a later result", async ({ admin }) => {
    const season = await createSeason(admin, 2);
    await publishResult(admin, season.weeks[0].id, picks(season, ...RESULT));
    expect((await admin.api.get(`/contestants/${season.bakers.Casey}`)).body.eliminated).toBe(true);
    expect((await admin.api.get(`/contestants/${season.bakers.Alex}`)).body.eliminated).toBe(false);

    const again = await publishResult(admin, season.weeks[1].id, picks(season, "Alex", "Bo", "Casey", "Dana"));
    expect(again.status).toBe(409);
  });
});

test.describe("scoring", () => {
  test("correct picks score 10, 5, 10 and 3, with a per-category breakdown", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const weekId = season.weeks[0].id;
    const { league, members } = await leagueWith(admin, season, 7);
    const [perfect, starOnly, technicalOnly, eliminatedOnly, specialOnly, wrong, none] = members;
    // "Wrong" picks use bakers the result doesn't name.
    await submitPrediction(perfect, weekId, picks(season, "Alex", "Bo", "Casey", "Dana"));
    await submitPrediction(starOnly, weekId, picks(season, "Alex", "Frankie", "Elliot", "Bo"));
    await submitPrediction(technicalOnly, weekId, picks(season, "Frankie", "Bo", "Elliot", "Alex"));
    await submitPrediction(eliminatedOnly, weekId, picks(season, "Frankie", "Alex", "Casey", "Bo"));
    await submitPrediction(specialOnly, weekId, picks(season, "Frankie", "Alex", "Elliot", "Dana"));
    await submitPrediction(wrong, weekId, picks(season, "Bo", "Alex", "Elliot", "Frankie"));
    await publishResult(admin, weekId, picks(season, ...RESULT));

    const rows = await standings(perfect, league.id);
    expect(rowFor(rows, perfect)).toMatchObject({
      star_baker_points: 10,
      technical_winner_points: 5,
      eliminated_points: 10,
      weekly_special_points: 3,
      total_points: 28,
      correct_predictions: 4,
    });
    expect(rowFor(rows, starOnly)).toMatchObject({ star_baker_points: 10, total_points: 10, correct_predictions: 1 });
    expect(rowFor(rows, technicalOnly)).toMatchObject({ technical_winner_points: 5, total_points: 5 });
    expect(rowFor(rows, eliminatedOnly)).toMatchObject({ eliminated_points: 10, total_points: 10 });
    expect(rowFor(rows, specialOnly)).toMatchObject({ weekly_special_points: 3, total_points: 3 });
    expect(rowFor(rows, wrong)).toMatchObject({ total_points: 0, correct_predictions: 0 });
    // A member who never predicted still appears, with zeros.
    expect(rowFor(rows, none)).toMatchObject({ total_points: 0, correct_predictions: 0 });
  });

  test("a league with no published result lists every member on zero, all ranked first", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const { league, members } = await leagueWith(admin, season, 3);
    const rows = await standings(members[0], league.id);
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.total_points === 0 && row.rank === 1)).toBe(true);
  });

  test("overall score sums the weekly scores of every published week", async ({ admin }) => {
    const season = await createSeason(admin, 3);
    const [w1, w2, w3] = season.weeks;
    const { league, members } = await leagueWith(admin, season, 1);
    const [ada] = members;
    await submitPrediction(ada, w1.id, picks(season, "Alex", "Bo", "Casey", "Dana")); // 28
    await submitPrediction(ada, w2.id, picks(season, "Bo", "Frankie", "Elliot", "Alex")); // 20 once the week 2 result is published
    await submitPrediction(ada, w3.id, picks(season, "Alex", "Bo", "Frankie", "Dana")); // never published

    await publishResult(admin, w1.id, picks(season, "Alex", "Bo", "Casey", "Dana"));
    await publishResult(admin, w2.id, picks(season, "Bo", "Alex", "Elliot", "Frankie")); // star 10 + elim 10

    const week1 = (await ada.api.get(`/leagues/${league.id}/weeks/${w1.id}/scores`)).body.data[0];
    const week2 = (await ada.api.get(`/leagues/${league.id}/weeks/${w2.id}/scores`)).body.data[0];
    const week3 = (await ada.api.get(`/leagues/${league.id}/weeks/${w3.id}/scores`)).body.data[0];
    expect(week1.total_points).toBe(28);
    expect(week2).toMatchObject({ star_baker_points: 10, eliminated_points: 10, total_points: 20 });
    expect(week3.total_points).toBe(0); // no result yet

    expect((await standings(ada, league.id))[0]).toMatchObject({
      total_points: 48,
      correct_predictions: 6,
    });
  });
});

test.describe("standings", () => {
  test("rank by points then correct picks; full ties share a rank and the next rank skips", async ({ admin }) => {
    const season = await createSeason(admin, 2);
    const [w1, w2] = season.weeks;
    const { league, members } = await leagueWith(admin, season, 4);
    const [oneCorrect, twoCorrectA, twoCorrectB, nobody] = members;

    // Week 1 (result: Alex, Bo, Casey, Dana): 10 pts for oneCorrect, 5 pts for the others.
    await submitPrediction(oneCorrect, w1.id, picks(season, "Alex", "Frankie", "Elliot", "Bo"));
    await submitPrediction(twoCorrectA, w1.id, picks(season, "Frankie", "Bo", "Elliot", "Alex"));
    await submitPrediction(twoCorrectB, w1.id, picks(season, "Frankie", "Bo", "Elliot", "Alex"));
    await publishResult(admin, w1.id, picks(season, "Alex", "Bo", "Casey", "Dana"));
    // Week 2 (result: Alex, Bo, Elliot, Dana): another 5 pts for the two who repeat the technical pick.
    await submitPrediction(twoCorrectA, w2.id, picks(season, "Frankie", "Bo", "Dana", "Alex"));
    await submitPrediction(twoCorrectB, w2.id, picks(season, "Frankie", "Bo", "Dana", "Alex"));
    await publishResult(admin, w2.id, picks(season, "Alex", "Bo", "Elliot", "Dana"));

    const rows = await standings(oneCorrect, league.id);
    // 10 points each, but two correct picks beat one; the pair share rank 1.
    expect(rowFor(rows, twoCorrectA)).toMatchObject({ total_points: 10, correct_predictions: 2, rank: 1 });
    expect(rowFor(rows, twoCorrectB)).toMatchObject({ total_points: 10, correct_predictions: 2, rank: 1 });
    expect(rowFor(rows, oneCorrect)).toMatchObject({ total_points: 10, correct_predictions: 1, rank: 3 });
    expect(rowFor(rows, nobody)).toMatchObject({ total_points: 0, rank: 4 });
    expect(rows.map((row) => row.rank)).toEqual([1, 1, 3, 4]);
  });

  test("the same picks are scored separately in each of the user's leagues", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const weekId = season.weeks[0].id;
    const ada = await newUser("ada");
    const bo = await newUser("bo");
    const cy = await newUser("cy");
    const one = await createLeague(ada, season, "One");
    const two = await createLeague(cy, season, "Two");
    await joinLeague(bo, one.invite_code);
    await joinLeague(ada, two.invite_code);

    const perfect = picks(season, "Alex", "Bo", "Casey", "Dana");
    await submitPrediction(ada, weekId, perfect);
    await submitPrediction(bo, weekId, picks(season, "Alex", "Frankie", "Elliot", "Bo"));
    await submitPrediction(cy, weekId, perfect);
    await publishResult(admin, weekId, perfect);

    const inOne = await standings(ada, one.id);
    expect(rowFor(inOne, ada)).toMatchObject({ total_points: 28, rank: 1 });
    expect(rowFor(inOne, bo)).toMatchObject({ total_points: 10, rank: 2 });
    const inTwo = await standings(ada, two.id);
    expect(rowFor(inTwo, ada)).toMatchObject({ total_points: 28, rank: 1 });
    expect(rowFor(inTwo, cy)).toMatchObject({ total_points: 28, rank: 1 });
    expect(inOne.map((row) => row.user_id)).not.toContain(cy.id);
  });

  test("the weekly view ranks members for that week only", async ({ admin }) => {
    const season = await createSeason(admin, 2);
    const [w1, w2] = season.weeks;
    const { league, members } = await leagueWith(admin, season, 2);
    const [ada, bo] = members;
    await submitPrediction(ada, w1.id, picks(season, "Alex", "Bo", "Casey", "Dana"));
    await submitPrediction(bo, w1.id, picks(season, "Frankie", "Alex", "Elliot", "Bo"));
    await submitPrediction(bo, w2.id, picks(season, "Alex", "Bo", "Elliot", "Dana"));
    await publishResult(admin, w1.id, picks(season, "Alex", "Bo", "Casey", "Dana"));
    await publishResult(admin, w2.id, picks(season, "Alex", "Bo", "Elliot", "Dana"));

    const week1 = (await ada.api.get(`/leagues/${league.id}/weeks/${w1.id}/scores`)).body.data;
    expect(rowFor(week1, ada)).toMatchObject({ total_points: 28, rank: 1 });
    expect(rowFor(week1, bo)).toMatchObject({ total_points: 0, rank: 2 });
    const week2 = (await ada.api.get(`/leagues/${league.id}/weeks/${w2.id}/scores`)).body.data;
    expect(rowFor(week2, bo)).toMatchObject({ total_points: 28, rank: 1 });
    expect(rowFor(week2, ada)).toMatchObject({ total_points: 0, rank: 2 });
  });

  test("correcting a result rescores every affected league", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const weekId = season.weeks[0].id;
    const ada = await newUser("ada");
    const bo = await newUser("bo");
    const one = await createLeague(ada, season, "One");
    const two = await createLeague(bo, season, "Two");
    await joinLeague(ada, two.invite_code);
    await submitPrediction(ada, weekId, picks(season, "Alex", "Bo", "Casey", "Dana"));
    await submitPrediction(bo, weekId, picks(season, "Bo", "Alex", "Elliot", "Frankie"));
    const published = await publishResult(admin, weekId, picks(season, "Alex", "Bo", "Casey", "Dana"));
    expect(rowFor(await standings(ada, one.id), ada).total_points).toBe(28);

    // The real star baker was Bo, not Alex.
    const fix = await admin.api.patch(`/results/${published.body.id}`, { star_baker: season.bakers.Bo });
    expect(fix.status).toBe(200);

    expect(rowFor(await standings(ada, one.id), ada).total_points).toBe(18);
    const inTwo = await standings(bo, two.id);
    expect(rowFor(inTwo, ada).total_points).toBe(18);
    expect(rowFor(inTwo, bo)).toMatchObject({ star_baker_points: 10, total_points: 10, rank: 2 });
    expect(rowFor(inTwo, ada).rank).toBe(1);
  });

  test("moving a result to another week, or deleting it, clears the scores it produced", async ({ admin }) => {
    const season = await createSeason(admin, 2);
    const [w1, w2] = season.weeks;
    const { league, members } = await leagueWith(admin, season, 1);
    const [ada] = members;
    const perfect = picks(season, "Alex", "Bo", "Casey", "Dana");
    await submitPrediction(ada, w1.id, perfect);
    await submitPrediction(ada, w2.id, perfect);
    const published = await publishResult(admin, w1.id, perfect);
    const weekScore = async (weekId: number) =>
      (await ada.api.get(`/leagues/${league.id}/weeks/${weekId}/scores`)).body.data[0].total_points;
    expect(await weekScore(w1.id)).toBe(28);
    expect(await weekScore(w2.id)).toBe(0);

    // Moved to week 2: week 1 loses its score, week 2 gains one; the total is not double counted.
    const moved = await admin.api.patch(`/results/${published.body.id}`, { week: w2.id });
    expect(moved.status).toBe(200);
    expect(await weekScore(w1.id)).toBe(0);
    expect(await weekScore(w2.id)).toBe(28);
    expect((await standings(ada, league.id))[0].total_points).toBe(28);

    expect((await admin.api.delete(`/results/${published.body.id}`)).status).toBe(204);
    expect(await weekScore(w2.id)).toBe(0);
    expect((await standings(ada, league.id))[0]).toMatchObject({ total_points: 0, correct_predictions: 0 });
  });
});
