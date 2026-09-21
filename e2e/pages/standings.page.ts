import { expect, type Locator, type Page } from "@playwright/test";

export interface StandingsRow {
  rank: string;
  name: string;
  points: number;
  isYou: boolean;
}

export class StandingsPage {
  readonly heading: Locator;
  readonly leagueName: Locator;
  readonly leagueSelect: Locator;
  readonly rows: Locator;
  readonly scoringGuide: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole("heading", { name: "League Standings" });
    this.leagueName = page.locator(".standings-heading .subtitle");
    this.leagueSelect = page.locator(".league-select");
    this.rows = page.locator(".standings-row");
    this.scoringGuide = page.locator(".scoring-guide .scoring-items span");
  }

  async waitForRows() {
    await expect(this.rows.first()).toBeVisible();
  }

  async entries(): Promise<StandingsRow[]> {
    await this.waitForRows();
    return this.rows.evaluateAll((rows) =>
      rows.map((row) => ({
        rank: row.children[0].textContent ?? "",
        name: row.querySelector(".standings-name")?.childNodes[0].textContent ?? "",
        points: Number(row.querySelector(".points")?.textContent),
        isYou: row.classList.contains("you"),
      })),
    );
  }

  async selectLeague(name: string) {
    await this.leagueSelect.selectOption({ label: name });
  }
}
