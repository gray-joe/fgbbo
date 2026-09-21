import { expect, test, type SignedInPage } from "../../fixtures";
import { daysFromNow, newUser, signInAs } from "../../api/world";
import { AppShell } from "../../pages/app-shell.page";
import { PicksPage } from "../../pages/picks.page";

// SPEC §3 Prediction, §4 Predictions

async function openPicks(signedInPage: SignedInPage, user: Parameters<SignedInPage>[0]) {
  const page = await signedInPage(user);
  await new AppShell(page).goto();
  const picks = new PicksPage(page);
  await expect(picks.episodes.first()).toBeVisible();
  return { page, picks };
}

test.describe("making picks", () => {
  test("lists the season's episodes with their theme and whether they have aired", async ({ signedInPage }) => {
    const { picks } = await openPicks(signedInPage, await newUser("strip"));

    await expect(picks.episodes).toHaveCount(4);
    await expect(picks.episode(1)).toContainText("Cake Week");
    await expect(picks.episode(1)).toContainText("Aired");
    await expect(picks.episode(2)).toContainText("Bread Week");
    await expect(picks.episode(2)).toContainText("Upcoming");
    await expect(picks.episode(3)).toContainText("Upcoming");
  });

  test("opens on the first episode without a result, ready for picks", async ({ signedInPage }) => {
    const { picks } = await openPicks(signedInPage, await newUser("default"));

    await expect(picks.episode(2)).toHaveClass(/active/);
    await expect(picks.weekTitle).toHaveText("Bread Week");
    await expect(picks.status).toHaveText("OPEN");
  });

  test("shows what each category is worth", async ({ signedInPage }) => {
    const { picks } = await openPicks(signedInPage, await newUser("points"));

    await expect(picks.points("Star Baker")).toHaveText("10 PTS");
    await expect(picks.points("Technical Winner")).toHaveText("5 PTS");
    await expect(picks.points("Eliminated")).toHaveText("10 PTS");
    await expect(picks.points("Weekly Special")).toHaveText("3 PTS");
  });

  test("only bakers still in the competition can be picked", async ({ signedInPage }) => {
    const { picks } = await openPicks(signedInPage, await newUser("eligible"));

    // Casey went home in episode 1.
    for (const category of ["Star Baker", "Technical Winner", "Eliminated", "Weekly Special"] as const) {
      await expect(picks.bakers(category)).toHaveText(["Alex", "Bo", "Dana", "Elliot", "Frankie"]);
    }
  });

  test("a user with no league can save picks, then edit them before the deadline", async ({ signedInPage, seed }) => {
    const user = await newUser("picker");
    expect(await user.api.list("/leagues")).toHaveLength(0);
    const { page, picks } = await openPicks(signedInPage, user);
    const weekId = seed.weeks[2].id;

    await expect(picks.saveButton).toHaveText("Save picks");
    await picks.pickAll("Alex", "Bo", "Dana", "Elliot");
    await picks.save();
    await expect(picks.saveButton).toHaveText("Update picks");
    const saved = await user.api.get(`/weeks/${seed.weeks[2].id}/prediction`);
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({
      star_baker: seed.bakers.Alex,
      technical_winner: seed.bakers.Bo,
      eliminated: seed.bakers.Dana,
      weekly_special: seed.bakers.Elliot,
    });

    // Reloading shows the saved picks; editing updates them.
    await page.reload();
    await expect(picks.selected("Star Baker")).toHaveText("Alex");
    await expect(picks.saveButton).toHaveText("Update picks");
    await picks.pick("Star Baker", "Frankie");
    await picks.save();
    await expect(picks.saveButton).toHaveText("Update picks");
    const edited = await user.api.get(`/weeks/${weekId}/prediction`);
    expect(edited.body.star_baker).toBe(seed.bakers.Frankie);
  });

  test("all four categories must be picked before saving", async ({ signedInPage, seed }) => {
    const user = await newUser("partial");
    const { picks } = await openPicks(signedInPage, user);

    await picks.pick("Star Baker", "Alex");
    await picks.save();

    await expect(picks.error).toHaveText("Pick a baker for every category first.");
    expect((await user.api.get(`/weeks/${seed.weeks[2].id}/prediction`)).status).toBe(404);
  });

  test("an episode that has aired is locked", async ({ signedInPage }) => {
    const { picks } = await openPicks(signedInPage, await newUser("aired"));
    await picks.selectEpisode(1);

    await expect(picks.status).toHaveText("LOCKED");
    await expect(picks.bakers("Star Baker").first()).toBeDisabled();
    await expect(picks.saveButton).toBeHidden();
  });

  test("an episode past its deadline is locked even without a result", async ({ signedInPage }) => {
    const { picks } = await openPicks(signedInPage, await newUser("late"));
    await picks.selectEpisode(4);

    await expect(picks.weekTitle).toHaveText("Biscuit Week");
    await expect(picks.status).toHaveText("LOCKED");
    await expect(picks.saveButton).toBeHidden();
  });

  test("a locked episode still shows the picks the user made", async ({ signedInPage, seed }) => {
    const alice = await signInAs(seed.users.alice.email);
    const { picks } = await openPicks(signedInPage, alice);
    await picks.selectEpisode(1);

    await expect(picks.selected("Star Baker")).toHaveText("Alex");
    await expect(picks.selected("Technical Winner")).toHaveText("Bo");
    // Casey went home in this episode, but the pick is still shown.
    await expect(picks.selected("Eliminated")).toHaveText("Casey");
    await expect(picks.selected("Weekly Special")).toHaveText("Dana");
  });

  test("if the deadline passes while the page is open, saving is rejected", async ({ signedInPage, admin, seed }) => {
    const week = await admin.api.must("POST", "/weeks", {
      number: 99,
      theme: "Closing Week",
      season_id: seed.season.id,
      prediction_deadline: daysFromNow(1),
    });
    try {
      const user = await newUser("racer");
      const { picks } = await openPicks(signedInPage, user);
      await picks.selectEpisode(99);
      await expect(picks.status).toHaveText("OPEN");
      await picks.pickAll("Alex", "Bo", "Dana", "Elliot");

      await admin.api.must("PATCH", `/weeks/${week.id}`, { prediction_deadline: daysFromNow(-1) });
      await picks.save();

      await expect(picks.error).toHaveText("Predictions for this week are locked");
      expect((await user.api.get(`/weeks/${week.id}/prediction`)).status).toBe(404);
    } finally {
      await admin.api.delete(`/weeks/${week.id}`);
    }
  });
});

test.describe("the deadline", () => {
  test("an open episode shows when picks lock", async ({ signedInPage, seed, admin }) => {
    const { page, picks } = await openPicks(signedInPage, await newUser("clock"));
    const week = (await admin.api.get(`/weeks/${seed.weeks[2].id}`)).body;
    // Format the same way the app does, in the browser's own locale and zone.
    const expected = await page.evaluate(
      (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }),
      week.prediction_deadline,
    );

    await expect(picks.deadline).toHaveText(`Picks lock ${expected}`);
  });

  test("a locked episode says picks are locked", async ({ signedInPage }) => {
    const { picks } = await openPicks(signedInPage, await newUser("clock"));
    await picks.selectEpisode(1);
    await expect(picks.deadline).toHaveText("Picks are locked");
  });
});
