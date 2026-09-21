import { expect, test } from "../../fixtures";
import { createLeague, joinLeague, newUser, signInAs, standings } from "../../api/world";
import { AppShell } from "../../pages/app-shell.page";
import { LeagueGatePage } from "../../pages/league-gate.page";
import { StandingsPage } from "../../pages/standings.page";

// SPEC §3 League, §4 Standings

test.describe("league standings", () => {
  test("ranks members by points, with tied members sharing a rank", async ({ signedInPage, seed }) => {
    const page = await signedInPage(await signInAs(seed.users.cara.email));
    const shell = new AppShell(page);
    const table = new StandingsPage(page);
    await shell.goto();
    await shell.open("Standings");

    await expect(table.heading).toBeVisible();
    await expect(table.leagueName).toHaveText(seed.league.name);
    // Alice and Bob tie on 28 (rank 1), Cara has 13 (rank 3, not 2), Dan never predicted (rank 4).
    expect(await table.entries()).toEqual([
      { rank: "★", name: "Alice", points: 28, isYou: false },
      { rank: "★", name: "Bob", points: 28, isYou: false },
      { rank: "3", name: "You", points: 13, isYou: true },
      { rank: "4", name: "Dan", points: 0, isYou: false },
    ]);
  });

  test("marks the signed-in member's own row", async ({ signedInPage, seed }) => {
    const page = await signedInPage(await signInAs(seed.users.alice.email));
    const shell = new AppShell(page);
    const table = new StandingsPage(page);
    await shell.goto();
    await shell.open("Standings");

    const entries = await table.entries();
    expect(entries.filter((entry) => entry.isYou)).toEqual([
      { rank: "★", name: "You", points: 28, isYou: true },
    ]);
    await expect(table.rows.locator(".badge")).toHaveText("YOU");
  });

  test("shows the scoring guide", async ({ signedInPage, seed }) => {
    const page = await signedInPage(await signInAs(seed.users.bob.email));
    const shell = new AppShell(page);
    await shell.goto();
    await shell.open("Standings");

    await expect(new StandingsPage(page).scoringGuide).toHaveText([
      "10 Star Baker",
      "10 Eliminated",
      "5 Technical Winner",
      "3 Weekly Special",
    ]);
  });

  test("a member of several leagues can switch between them", async ({ signedInPage, seed }) => {
    const ada = await newUser("ada");
    const bo = await newUser("bo");
    const season = { id: seed.season.id } as Parameters<typeof createLeague>[1];
    const alpha = await createLeague(ada, season, "Alpha League");
    await createLeague(ada, season, "Beta League");
    await joinLeague(bo, alpha.invite_code);

    const page = await signedInPage(ada);
    const shell = new AppShell(page);
    const table = new StandingsPage(page);
    await shell.goto();
    await shell.open("Standings");

    await expect(table.leagueSelect).toBeVisible();
    await expect(table.leagueName).toHaveText("Alpha League");
    expect(await table.entries()).toHaveLength(2);

    await table.selectLeague("Beta League");
    await expect(table.leagueName).toHaveText("Beta League");
    await expect(table.rows).toHaveCount(1);
    expect(await table.entries()).toEqual([{ rank: "★", name: "You", points: 0, isYou: true }]);
  });

  test("a member who has deleted their account shows as a former member", async ({ signedInPage, seed }) => {
    const owner = await newUser("owner");
    const leaver = await newUser("leaver");
    const league = await createLeague(owner, { id: seed.season.id } as Parameters<typeof createLeague>[1], "Turnover");
    await joinLeague(leaver, league.invite_code);
    await leaver.api.must("DELETE", `/users/${leaver.id}`);

    const page = await signedInPage(owner);
    const shell = new AppShell(page);
    const table = new StandingsPage(page);
    await shell.goto();
    await shell.open("Standings");

    const names = (await table.entries()).map((entry) => entry.name);
    expect(names.sort()).toEqual(["Former member", "You"]);
  });

  test("a member of one league gets no league switcher", async ({ signedInPage, seed }) => {
    const page = await signedInPage(await signInAs(seed.users.dan.email));
    const shell = new AppShell(page);
    await shell.goto();
    await shell.open("Standings");

    await expect(new StandingsPage(page).heading).toBeVisible();
    await expect(new StandingsPage(page).leagueSelect).toBeHidden();
  });
});

test.describe("finding a league", () => {
  test("a user with no league can create one and lands on its standings", async ({ signedInPage }) => {
    const user = await newUser("founder");
    const page = await signedInPage(user);
    const shell = new AppShell(page);
    const gate = new LeagueGatePage(page);
    const table = new StandingsPage(page);
    await shell.goto();
    await shell.open("Standings");

    await expect(gate.joinHeading).toBeVisible();
    await gate.create("Founders League");

    await expect(table.leagueName).toHaveText("Founders League");
    expect(await table.entries()).toEqual([{ rank: "★", name: "You", points: 0, isYou: true }]);
    const mine = await user.api.list("/leagues");
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ name: "Founders League", owner: user.id });
  });

  test("a user can join with an invite code, and new members all start level", async ({ signedInPage, seed }) => {
    const owner = await newUser("owner");
    const league = await createLeague(owner, { id: seed.season.id } as Parameters<typeof createLeague>[1], "Friends");
    const joiner = await newUser("joiner");
    const page = await signedInPage(joiner);
    const shell = new AppShell(page);
    const gate = new LeagueGatePage(page);
    const table = new StandingsPage(page);
    await shell.goto();
    await shell.open("Standings");

    await gate.join(league.invite_code);

    await expect(table.leagueName).toHaveText("Friends");
    const entries = await table.entries();
    expect(entries).toHaveLength(2);
    expect(entries.every((entry) => entry.rank === "★" && entry.points === 0)).toBe(true);
    expect((await standings(owner, league.id)).map((row) => row.user_id)).toContain(joiner.id);
  });

  test("a wrong invite code is rejected", async ({ signedInPage }) => {
    const page = await signedInPage(await newUser("lost"));
    const shell = new AppShell(page);
    const gate = new LeagueGatePage(page);
    await shell.goto();
    await shell.open("Standings");

    await gate.join("not-a-real-code");

    await expect(gate.error).toHaveText("Invalid invite code");
    await expect(gate.joinHeading).toBeVisible();
  });
});
