import { expect, type Locator, type Page } from "@playwright/test";

import { openAdminSection } from "./admin-nav";

export class AdminSeasonPage {
  readonly notice: Locator;
  readonly error: Locator;
  readonly confirmBox: Locator;

  constructor(private readonly page: Page) {
    this.notice = page.getByRole("status");
    this.error = page.getByRole("alert");
    this.confirmBox = page.getByRole("group", { name: "Confirm season change" });
  }

  async open() {
    await openAdminSection(this.page, "Season & bakers");
    await expect(this.page.getByRole("heading", { name: "Seasons" })).toBeVisible();
  }

  seasonRow(name: string) {
    return this.page.getByRole("row").filter({ hasText: name });
  }

  async createSeason(name: string, options: { active?: boolean } = {}) {
    await this.page.getByLabel("Season name").fill(name);
    if (options.active) await this.page.getByLabel("Make it the active season").check();
    await this.page.getByRole("button", { name: "Create season" }).click();
  }

  async makeActive(name: string) {
    await this.page.getByRole("button", { name: `Make ${name} active` }).click();
  }

  async endSeason(name: string) {
    await this.page.getByRole("button", { name: `End ${name}` }).click();
  }

  async confirm(name: string | RegExp) {
    await this.confirmBox.getByRole("button", { name }).click();
  }

  bakerRow(name: string) {
    return this.page.getByRole("row").filter({ has: this.page.getByRole("cell", { name, exact: true }) });
  }

  async addBaker(name: string) {
    await this.page.getByLabel("Baker name").fill(name);
    await this.page.getByRole("button", { name: "Add baker" }).click();
  }

  async rename(from: string, to: string) {
    await this.page.getByRole("button", { name: `Rename ${from}` }).click();
    await this.page.getByLabel(`Name for ${from}`).fill(to);
    await this.page.getByRole("button", { name: "Save", exact: true }).click();
  }

  removeButton(name: string) {
    return this.page.getByRole("button", { name: `Remove ${name}` });
  }

  async remove(name: string) {
    await this.removeButton(name).click();
    await this.page.getByRole("button", { name: "Confirm remove" }).click();
  }
}
