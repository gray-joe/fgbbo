import { expect, type Locator, type Page } from "@playwright/test";

export type Category = "Star Baker" | "Technical Winner" | "Eliminated" | "Weekly Special";

export class PicksPage {
  readonly episodes: Locator;
  readonly weekTitle: Locator;
  readonly status: Locator;
  readonly error: Locator;
  readonly saveButton: Locator;
  readonly deadline: Locator;

  constructor(private readonly page: Page) {
    this.episodes = page.locator(".ep-chip");
    this.weekTitle = page.locator(".week-banner h3");
    this.status = page.locator(".status-pill");
    this.error = page.locator(".form-error");
    this.saveButton = page.locator("button.save-button");
    this.deadline = page.locator(".week-banner .deadline");
  }

  episode(number: number) {
    return this.episodes.filter({ hasText: new RegExp(`^EP ${number}(?!\\d)`) });
  }

  async selectEpisode(number: number) {
    await this.episode(number).click();
    await expect(this.episode(number)).toHaveClass(/active/);
  }

  private category(name: Category) {
    return this.page.locator(".category").filter({
      has: this.page.getByRole("heading", { name, exact: true }),
    });
  }

  bakers(name: Category) {
    return this.category(name).locator(".baker-card");
  }

  points(name: Category) {
    return this.category(name).locator(".points-pill");
  }

  selected(name: Category) {
    return this.category(name).locator(".baker-card.selected .baker-name");
  }

  async pick(name: Category, baker: string) {
    await this.category(name).getByRole("button", { name: baker, exact: true }).click();
  }

  async pickAll(star: string, technical: string, eliminated: string, special: string) {
    await this.pick("Star Baker", star);
    await this.pick("Technical Winner", technical);
    await this.pick("Eliminated", eliminated);
    await this.pick("Weekly Special", special);
  }

  async save() {
    await this.saveButton.click();
  }
}
