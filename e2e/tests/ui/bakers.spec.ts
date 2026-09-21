import { expect, test } from "../../fixtures";
import { newUser } from "../../api/world";
import { AppShell } from "../../pages/app-shell.page";
import { BakersPage } from "../../pages/bakers.page";
import { PicksPage } from "../../pages/picks.page";

// SPEC §3 Season, Contestant

test.describe("the bakers", () => {
  test("lists the active season's bakers, marking who has been eliminated", async ({ signedInPage, seed }) => {
    const page = await signedInPage(await newUser("fan"));
    const shell = new AppShell(page);
    const bakers = new BakersPage(page);
    await shell.goto();
    await shell.open("Bakers");

    await expect(bakers.heading).toBeVisible();
    await expect(bakers.subtitle).toHaveText(`Season ${seed.season.name}`);
    expect(await bakers.entries()).toEqual([
      { name: "Alex", status: "Still baking" },
      { name: "Bo", status: "Still baking" },
      { name: "Casey", status: "Eliminated" },
      { name: "Dana", status: "Still baking" },
      { name: "Elliot", status: "Still baking" },
      { name: "Frankie", status: "Still baking" },
    ]);
  });

  test("says so when there is no active season", async ({ signedInPage, admin, seed }) => {
    await admin.api.must("PATCH", `/seasons/${seed.season.id}`, { active: false });
    try {
      const page = await signedInPage(await newUser("early"));
      const shell = new AppShell(page);
      await shell.goto();
      await expect(page.getByText("No active season yet.")).toBeVisible();
      await expect(new PicksPage(page).episodes).toHaveCount(0);

      await shell.open("Bakers");
      await expect(page.getByText("No active season yet.")).toBeVisible();
      await expect(new BakersPage(page).cards).toHaveCount(0);
    } finally {
      await admin.api.must("PATCH", `/seasons/${seed.season.id}`, { active: true });
    }
  });
});
