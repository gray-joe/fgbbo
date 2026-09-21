import { expect, type Locator, type Page } from "@playwright/test";

import { openAdminSection } from "./admin-nav";

export class AdminWeeksPage {
  readonly rows: Locator;
  readonly notice: Locator;
  readonly error: Locator;

  constructor(private readonly page: Page) {
    this.rows = page.locator(".admin-table tbody tr");
    this.notice = page.getByRole("status");
    this.error = page.getByRole("alert");
  }

  async open() {
    await openAdminSection(this.page, "Weeks");
    await expect(this.page.getByRole("heading", { name: "Add a week" })).toBeVisible();
  }

  row(number: number) {
    return this.rows.filter({ has: this.page.getByRole("cell", { name: String(number), exact: true }) });
  }

  /** `deadline` is a local `YYYY-MM-DDTHH:mm` value, as a date-time picker takes. */
  async add(theme: string, deadline: string, number?: number) {
    if (number !== undefined) await this.page.getByLabel("Week number").fill(String(number));
    await this.page.getByLabel("Theme", { exact: true }).fill(theme);
    await this.page.getByLabel("Deadline", { exact: true }).fill(deadline);
    await this.page.getByRole("button", { name: "Add week" }).click();
  }

  async edit(number: number, changes: { theme?: string; deadline?: string }) {
    await this.page.getByRole("button", { name: `Edit week ${number}` }).click();
    if (changes.theme !== undefined) await this.page.getByLabel(`Theme for week ${number}`).fill(changes.theme);
    if (changes.deadline !== undefined) await this.page.getByLabel(`Deadline for week ${number}`).fill(changes.deadline);
    await this.page.getByRole("button", { name: "Save", exact: true }).click();
  }

  deleteButton(number: number) {
    return this.page.getByRole("button", { name: `Delete week ${number}` });
  }

  async delete(number: number) {
    await this.deleteButton(number).click();
    await this.page.getByRole("button", { name: "Confirm delete" }).click();
  }
}
