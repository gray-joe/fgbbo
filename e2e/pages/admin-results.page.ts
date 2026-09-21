import { expect, type Locator, type Page } from "@playwright/test";

import { openAdminSection } from "./admin-nav";
import type { Category } from "./picks.page";

export class AdminResultsPage {
  readonly episodes: Locator;
  readonly notice: Locator;
  readonly error: Locator;
  readonly warning: Locator;
  readonly confirmBox: Locator;

  constructor(private readonly page: Page) {
    this.episodes = page.locator(".ep-chip");
    this.notice = page.getByRole("status");
    this.error = page.getByRole("alert");
    this.warning = page.locator(".warning");
    this.confirmBox = page.locator(".confirm-box");
  }

  async open() {
    await openAdminSection(this.page, "Results");
    await expect(this.episodes.first()).toBeVisible();
  }

  episode(number: number) {
    return this.episodes.filter({ hasText: new RegExp(`^EP ${number}(?!\\d)`) });
  }

  async selectWeek(number: number) {
    await this.episode(number).click();
    await expect(this.episode(number)).toHaveClass(/active/);
  }

  field(category: Category) {
    // Not exact: a select's accessible name includes its selected option text.
    return this.page.getByLabel(category);
  }

  async choose(category: Category, baker: string) {
    await this.field(category).selectOption({ label: baker });
  }

  async chooseAll(star: string, technical: string, eliminated: string, special: string) {
    await this.choose("Star Baker", star);
    await this.choose("Technical Winner", technical);
    await this.choose("Eliminated", eliminated);
    await this.choose("Weekly Special", special);
  }

  reviewButton() {
    return this.page.getByRole("button", { name: /^Review (and publish|correction)$/ });
  }

  button(name: string) {
    return this.page.getByRole("button", { name, exact: true });
  }
}
