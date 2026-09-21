import { expect, test, type SignedInPage } from "../../fixtures";
import {
  createLeague,
  joinLeague,
  newAdmin,
  newUser,
  picks,
  publishResult,
  standings,
  submitPrediction,
  type SeasonFixture,
} from "../../api/world";
import { AdminActivityPage } from "../../pages/admin-activity.page";
import { AdminResultsPage } from "../../pages/admin-results.page";
import { AdminSeasonPage } from "../../pages/admin-season.page";
import { AdminWeeksPage } from "../../pages/admin-weeks.page";
import { AppShell } from "../../pages/app-shell.page";
import { BakersPage } from "../../pages/bakers.page";
import { PicksPage } from "../../pages/picks.page";
import { ADMIN_EMAIL } from "../../support/env";

// SPEC §2 System administrator, §4 Official results, Audit trail

/** A fresh admin session (so logging out elsewhere can't break it), opened on the Admin tab. */
async function openAdmin(signedInPage: SignedInPage) {
  const admin = await newAdmin();
  const page = await signedInPage(admin);
  const shell = new AppShell(page);
  await shell.goto();
  await shell.open("Admin");
  return { admin, page, shell };
}

const totalFor = async (user: { id: number }, viewer: Parameters<typeof standings>[0], leagueId: number) =>
  (await standings(viewer, leagueId)).find((row) => row.user_id === user.id)!.total_points;

test.describe("admin access", () => {
  test("only administrators see the Admin tab", async ({ signedInPage }) => {
    const member = new AppShell(await signedInPage(await newUser("member")));
    await member.goto();
    await expect(member.tab("Make Picks")).toBeVisible();
    await expect(member.tab("Admin")).toBeHidden();

    const admin = new AppShell(await signedInPage(await newAdmin()));
    await admin.goto();
    await expect(admin.tab("Admin")).toBeVisible();
  });

  test("says so when there is no active season", async ({ signedInPage, admin, seed }) => {
    await admin.api.must("PATCH", `/seasons/${seed.season.id}`, { active: false });
    try {
      const { page } = await openAdmin(signedInPage);
      await expect(page.getByText("No active season yet.")).toBeVisible();
    } finally {
      await admin.api.must("PATCH", `/seasons/${seed.season.id}`, { active: true });
    }
  });
});

test.describe("results", () => {
  /** Two league members with picks for week 1: one perfect, one all wrong. */
  async function leagueWithPicks(season: SeasonFixture) {
    const owner = await newUser("owner");
    const member = await newUser("member");
    const league = await createLeague(owner, season);
    await joinLeague(member, league.invite_code);
    const weekId = season.weeks[0].id;
    await submitPrediction(owner, weekId, picks(season, "Alex", "Bo", "Casey", "Dana"));
    await submitPrediction(member, weekId, picks(season, "Frankie", "Elliot", "Dana", "Bo"));
    return { owner, member, league, weekId };
  }

  test("publishing asks for confirmation, then scores every league", async ({ signedInPage, activeSeason: season }) => {
    const { owner, league } = await leagueWithPicks(season);
    const { admin, page } = await openAdmin(signedInPage);
    const results = new AdminResultsPage(page);
    await results.open();

    // Starts on the first week without a result, and warns that picks are still open.
    await expect(results.episode(1)).toHaveClass(/active/);
    await expect(results.episode(1)).toContainText("No result");
    await expect(results.warning).toContainText("Publishing now locks them");
    await expect(results.reviewButton()).toBeDisabled();

    await results.chooseAll("Alex", "Bo", "Casey", "Dana");
    await results.reviewButton().click();
    await expect(results.confirmBox).toContainText("Star Baker: Alex");
    await expect(results.confirmBox).toContainText("Casey will be marked as eliminated");
    expect(await totalFor(owner, owner, league.id)).toBe(0); // nothing happens until confirmed

    await results.button("Confirm and publish").click();

    await expect(results.notice).toContainText("Result published");
    await expect(results.episode(1)).toContainText("Published");
    expect(await totalFor(owner, owner, league.id)).toBe(28);
    expect((await admin.api.get(`/contestants/${season.bakers.Casey}`)).body.eliminated).toBe(true);
  });

  test("Back and Cancel change nothing", async ({ signedInPage, activeSeason: season }) => {
    const { admin, weekId } = { ...(await leagueWithPicks(season)), admin: await newAdmin() };
    const published = await publishResult(admin, weekId, picks(season, "Alex", "Bo", "Casey", "Dana"));
    const { page } = await openAdmin(signedInPage);
    const results = new AdminResultsPage(page);
    await results.open();
    await results.selectWeek(1);

    await results.choose("Star Baker", "Elliot");
    await results.reviewButton().click();
    await results.button("Back").click();
    await expect(results.reviewButton()).toBeVisible();

    await results.button("Delete result").click();
    await results.button("Cancel").click();
    await expect(results.button("Delete result")).toBeVisible();

    const current = await admin.api.get(`/results/${published.body.id}`);
    expect(current.body.star_baker).toBe(season.bakers.Alex);
  });

  test("correcting a result recalculates scores and logs only what changed", async ({
    signedInPage,
    activeSeason: season,
  }) => {
    const { owner, league, weekId } = await leagueWithPicks(season);
    const admin = await newAdmin();
    const published = await publishResult(admin, weekId, picks(season, "Alex", "Bo", "Casey", "Dana"));
    expect(await totalFor(owner, owner, league.id)).toBe(28);
    const { page } = await openAdmin(signedInPage);
    const results = new AdminResultsPage(page);
    await results.open();
    await results.selectWeek(1);

    // The form starts on the published result.
    await expect(results.field("Star Baker")).toHaveValue(String(season.bakers.Alex));
    await expect(results.reviewButton()).toBeDisabled(); // no change yet
    await results.choose("Star Baker", "Elliot");
    await results.reviewButton().click();
    await expect(results.confirmBox).toContainText("Star Baker: Elliot (was Alex)");
    await results.button("Confirm correction").click();

    await expect(results.notice).toContainText("Result corrected");
    expect(await totalFor(owner, owner, league.id)).toBe(18);
    const log = await admin.api.get(`/audit-log?entity=results&entity_id=${published.body.id}&limit=1`);
    expect(log.body.data[0].action).toBe("results.update");
    expect(log.body.data[0].body).toEqual({ star_baker: season.bakers.Elliot });
  });

  test("deleting a result clears the week's scores", async ({ signedInPage, activeSeason: season }) => {
    const { owner, league, weekId } = await leagueWithPicks(season);
    const admin = await newAdmin();
    await publishResult(admin, weekId, picks(season, "Alex", "Bo", "Casey", "Dana"));
    const { page } = await openAdmin(signedInPage);
    const results = new AdminResultsPage(page);
    await results.open();
    await results.selectWeek(1);

    await results.button("Delete result").click();
    await expect(results.confirmBox).toContainText("scores for this week are cleared");
    await expect(results.confirmBox).toContainText("Picks reopen");
    await results.button("Confirm delete").click();

    await expect(results.notice).toContainText("Result deleted");
    await expect(results.episode(1)).toContainText("No result");
    expect(await totalFor(owner, owner, league.id)).toBe(0);
    expect((await admin.api.get(`/results?limit=100`)).body.data.some((r: { week: number }) => r.week === weekId)).toBe(
      false,
    );
  });

  test("an error from the server is shown and nothing is half-done", async ({ signedInPage, activeSeason: season }) => {
    const { weekId } = await leagueWithPicks(season);
    const admin = await newAdmin();
    const { page } = await openAdmin(signedInPage);
    const results = new AdminResultsPage(page);
    await results.open();
    await results.chooseAll("Alex", "Bo", "Casey", "Dana");
    await results.reviewButton().click();

    // Someone else publishes this week while the confirmation is open.
    await publishResult(admin, weekId, picks(season, "Frankie", "Elliot", "Bo", "Alex"));
    await results.button("Confirm and publish").click();

    await expect(results.error).toHaveText("A result already exists for this week");
    await expect(results.button("Confirm and publish")).toBeVisible();
  });

  test("bakers who have gone home are not offered", async ({ signedInPage, activeSeason: season }) => {
    const admin = await newAdmin();
    await publishResult(admin, season.weeks[0].id, picks(season, "Alex", "Bo", "Casey", "Dana"));
    const { page } = await openAdmin(signedInPage);
    const results = new AdminResultsPage(page);
    await results.open();
    await results.selectWeek(2);

    await expect(results.field("Star Baker").locator("option")).toHaveText([
      "Choose a baker…",
      "Alex",
      "Bo",
      "Dana",
      "Elliot",
      "Frankie",
    ]);
  });
});

test.describe("weeks", () => {
  test("adding a week puts it in the admin list and in members' Make Picks", async ({
    signedInPage,
    activeSeason: season,
  }) => {
    const { page } = await openAdmin(signedInPage);
    const weeks = new AdminWeeksPage(page);
    await weeks.open();
    await expect(weeks.rows).toHaveCount(season.weeks.length);

    const deadline = "2031-03-14T18:00";
    await weeks.add("Pastry Week", deadline); // number defaults to the next one, 4
    await expect(weeks.notice).toHaveText("Week added.");
    await expect(weeks.row(4)).toContainText("Pastry Week");
    await expect(weeks.row(4)).toContainText("Open");

    const admin = await newAdmin();
    const created = (await admin.api.get(`/weeks?season_id=${season.id}&limit=100`)).body.data.find(
      (w: { number: number }) => w.number === 4,
    );
    const expectedIso = await page.evaluate((value) => new Date(value).toISOString(), deadline);
    expect(created).toMatchObject({ theme: "Pastry Week", prediction_deadline: expectedIso });

    const memberPage = await signedInPage(await newUser("member"));
    await new AppShell(memberPage).goto();
    const picks = new PicksPage(memberPage);
    await expect(picks.episodes).toHaveCount(4);
    await expect(picks.episode(4)).toContainText("Pastry Week");
  });

  test("editing a week changes its theme and deadline, and logs only what changed", async ({
    signedInPage,
    activeSeason: season,
  }) => {
    const { admin, page } = await openAdmin(signedInPage);
    const weeks = new AdminWeeksPage(page);
    await weeks.open();
    const weekId = season.weeks[1].id;

    await weeks.edit(2, { theme: "Sourdough Week" });
    await expect(weeks.notice).toHaveText("Week updated.");
    await expect(weeks.row(2)).toContainText("Sourdough Week");

    await weeks.edit(2, { deadline: "2032-01-02T09:30" });
    await expect(weeks.notice).toHaveText("Week updated.");
    const expectedIso = await page.evaluate((value) => new Date(value).toISOString(), "2032-01-02T09:30");
    expect((await admin.api.get(`/weeks/${weekId}`)).body).toMatchObject({
      theme: "Sourdough Week",
      prediction_deadline: expectedIso,
    });

    const log = (await admin.api.get(`/audit-log?entity=weeks&entity_id=${weekId}&limit=2`)).body.data;
    expect(log[0].body).toEqual({ prediction_deadline: expectedIso });
    expect(log[1].body).toEqual({ theme: "Sourdough Week" });
  });

  test("a week can be deleted unless it has a result", async ({ signedInPage, activeSeason: season }) => {
    const admin = await newAdmin();
    await publishResult(admin, season.weeks[0].id, picks(season, "Alex", "Bo", "Casey", "Dana"));
    const { page } = await openAdmin(signedInPage);
    const weeks = new AdminWeeksPage(page);
    await weeks.open();

    await expect(weeks.deleteButton(1)).toBeDisabled();
    await expect(weeks.row(1)).toContainText("Result published");

    await weeks.delete(3);
    await expect(weeks.notice).toHaveText("Week deleted.");
    await expect(weeks.row(3)).toHaveCount(0);
    expect((await admin.api.get(`/weeks/${season.weeks[2].id}`)).status).toBe(404);
  });

  test("a clashing week number shows the server's message", async ({ signedInPage, activeSeason: season }) => {
    const { page } = await openAdmin(signedInPage);
    const weeks = new AdminWeeksPage(page);
    await weeks.open();

    await weeks.add("Duplicate", "2031-03-14T18:00", 1);

    await expect(weeks.error).toHaveText("A week with this number already exists in this season");
    await expect(weeks.rows).toHaveCount(season.weeks.length);
  });
});

test.describe("activity", () => {
  test("lists what admins did, newest first, with who and what", async ({ signedInPage, activeSeason: season }) => {
    const admin = await newAdmin();
    await publishResult(admin, season.weeks[0].id, picks(season, "Alex", "Bo", "Casey", "Dana"));
    await admin.api.must("PATCH", `/weeks/${season.weeks[1].id}`, { theme: "Renamed Week" });
    const { page } = await openAdmin(signedInPage);
    const activity = new AdminActivityPage(page);
    await activity.open();

    await expect.poll(async () => (await activity.entries())[1]?.details).toContain("star baker: Alex");
    const [latest, previous] = await activity.entries();
    expect(latest).toMatchObject({ who: ADMIN_EMAIL, what: "Edited week" });
    expect(latest.details).toContain("theme: Renamed Week");
    expect(previous).toMatchObject({ who: ADMIN_EMAIL, what: "Published result" });
    expect(previous.details).toContain("eliminated: Casey");
  });

  test("can be filtered to one kind of change", async ({ signedInPage, activeSeason: season }) => {
    const admin = await newAdmin();
    await publishResult(admin, season.weeks[0].id, picks(season, "Alex", "Bo", "Casey", "Dana"));
    const { page } = await openAdmin(signedInPage);
    const activity = new AdminActivityPage(page);
    await activity.open();

    await activity.filterBy("weeks");
    await expect(activity.rows.first()).toBeVisible();
    await expect.poll(async () => (await activity.entries()).every((e) => /week/i.test(e.what))).toBe(true);

    await activity.filterBy("results");
    await expect.poll(async () => (await activity.entries()).every((e) => /result/i.test(e.what))).toBe(true);
  });

  test("shows more when there is more", async ({ signedInPage, activeSeason: season }) => {
    const admin = await newAdmin();
    for (let i = 0; i < 22; i++) {
      await admin.api.must("PATCH", `/weeks/${season.weeks[2].id}`, { theme: `Theme ${i}` });
    }
    const { page } = await openAdmin(signedInPage);
    const activity = new AdminActivityPage(page);
    await activity.open();

    await expect(activity.rows).toHaveCount(20);
    await activity.loadMore.click();
    await expect.poll(() => activity.rows.count()).toBeGreaterThan(20);
  });
});

test.describe("season and bakers", () => {
  const uniqueName = (label: string) => `${label} ${Date.now().toString(36)}`;

  test("a new season can be created, then made active in place of the current one", async ({
    signedInPage,
    activeSeason: season,
  }) => {
    const { admin, page } = await openAdmin(signedInPage);
    const current = (await admin.api.get(`/seasons/${season.id}`)).body.name;
    const name = uniqueName("Series");
    const seasonPage = new AdminSeasonPage(page);
    await seasonPage.open();

    await seasonPage.createSeason(name);
    await expect(seasonPage.notice).toHaveText("Season created.");
    await expect(seasonPage.seasonRow(name)).toContainText("Not active");
    await expect(seasonPage.seasonRow(current)).toContainText("Active");

    await seasonPage.makeActive(name);
    await expect(seasonPage.confirmBox).toContainText(`${current} will stop being active`);
    await seasonPage.confirm("Confirm and activate");

    await expect(seasonPage.notice).toHaveText("Season is now active.");
    await expect(seasonPage.seasonRow(name)).toContainText("Active");
    await expect(page.getByText(`Managing ${name}`)).toBeVisible();
    const seasons = (await admin.api.get("/seasons?limit=100")).body.data as { name: string; active: boolean }[];
    expect(seasons.filter((s) => s.active).map((s) => s.name)).toEqual([name]);
  });

  test("a season can be created as the active one straight away", async ({ signedInPage, activeSeason: season }) => {
    const { admin, page } = await openAdmin(signedInPage);
    const name = uniqueName("Series");
    const seasonPage = new AdminSeasonPage(page);
    await seasonPage.open();

    await seasonPage.createSeason(name, { active: true });

    await expect(seasonPage.notice).toHaveText("Season created and made active.");
    await expect(page.getByText(`Managing ${name}`)).toBeVisible();
    expect((await admin.api.get(`/seasons/${season.id}`)).body.active).toBe(false);
  });

  test("ending the season leaves members with no active season", async ({ signedInPage, activeSeason: season }) => {
    const { admin, page } = await openAdmin(signedInPage);
    const name = (await admin.api.get(`/seasons/${season.id}`)).body.name;
    const seasonPage = new AdminSeasonPage(page);
    await seasonPage.open();

    await seasonPage.endSeason(name);
    await expect(seasonPage.confirmBox).toContainText("Members will see no active season");
    await seasonPage.confirm("Confirm and end");

    await expect(seasonPage.notice).toHaveText("Season ended.");
    await expect(page.getByText("No active season yet.")).toBeVisible();
    await expect(page.getByText("Make a season active to manage its bakers.")).toBeVisible();
    expect((await admin.api.get(`/seasons/${season.id}`)).body.active).toBe(false);
  });

  test("bakers can be added, renamed, and removed, and every change is logged", async ({
    signedInPage,
    activeSeason: season,
  }) => {
    const { admin, page } = await openAdmin(signedInPage);
    const seasonPage = new AdminSeasonPage(page);
    await seasonPage.open();
    await expect(seasonPage.bakerRow("Alex")).toContainText("Still baking");

    await seasonPage.addBaker("Zed");
    await expect(seasonPage.notice).toHaveText("Baker added.");
    await expect(seasonPage.bakerRow("Zed")).toContainText("Still baking");
    const zed = (await admin.api.get(`/contestants?season_id=${season.id}&limit=100`)).body.data.find(
      (c: { name: string }) => c.name === "Zed",
    );
    expect(zed).toMatchObject({ eliminated: false, season_id: season.id });

    // Members see the new baker.
    const memberPage = await signedInPage(await newUser("member"));
    const shell = new AppShell(memberPage);
    await shell.goto();
    await shell.open("Bakers");
    expect((await new BakersPage(memberPage).entries()).map((b) => b.name)).toContain("Zed");

    await seasonPage.rename("Zed", "Zed the Second");
    await expect(seasonPage.notice).toHaveText("Baker renamed.");
    await expect(seasonPage.bakerRow("Zed the Second")).toBeVisible();
    expect((await admin.api.get(`/contestants/${zed.id}`)).body.name).toBe("Zed the Second");

    await seasonPage.remove("Zed the Second");
    await expect(seasonPage.notice).toHaveText("Baker removed.");
    await expect(seasonPage.bakerRow("Zed the Second")).toHaveCount(0);
    expect((await admin.api.get(`/contestants/${zed.id}`)).status).toBe(404);

    const log = (await admin.api.get(`/audit-log?entity=contestants&entity_id=${zed.id}&limit=10`)).body.data;
    expect(log.map((e: { action: string }) => e.action).reverse()).toEqual([
      "contestants.create",
      "contestants.update",
      "contestants.delete",
    ]);
  });

  test("a baker named in a result can't be removed", async ({ signedInPage, activeSeason: season }) => {
    const admin = await newAdmin();
    await publishResult(admin, season.weeks[0].id, picks(season, "Alex", "Bo", "Casey", "Dana"));
    const { page } = await openAdmin(signedInPage);
    const seasonPage = new AdminSeasonPage(page);
    await seasonPage.open();

    await seasonPage.remove("Alex");

    await expect(seasonPage.error).toHaveText("Contestant is referenced by an official result");
    await expect(seasonPage.bakerRow("Alex")).toBeVisible();
    expect((await admin.api.get(`/contestants/${season.bakers.Alex}`)).status).toBe(200);
  });
});
