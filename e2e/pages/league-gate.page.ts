import { type Locator, type Page } from "@playwright/test";

/** Shown in the Standings tab when the user has no league yet. */
export class LeagueGatePage {
  readonly joinHeading: Locator;
  readonly createHeading: Locator;
  readonly error: Locator;

  constructor(private readonly page: Page) {
    this.joinHeading = page.getByRole("heading", { name: "Join a league" });
    this.createHeading = page.getByRole("heading", { name: "Create a league" });
    this.error = page.locator(".form-error");
  }

  async join(inviteCode: string) {
    await this.page.getByLabel("Invite code").fill(inviteCode);
    await this.page.getByRole("button", { name: "Join league" }).click();
  }

  async create(name: string) {
    await this.page.getByRole("button", { name: "Starting fresh? Create a league" }).click();
    await this.page.getByLabel("League name").fill(name);
    await this.page.getByRole("button", { name: "Create league" }).click();
  }
}
