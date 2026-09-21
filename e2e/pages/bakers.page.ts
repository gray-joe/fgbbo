import { expect, type Locator, type Page } from "@playwright/test";

export class BakersPage {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly cards: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole("heading", { name: "The Bakers" });
    this.subtitle = page.locator(".subtitle");
    this.cards = page.locator(".baker-card");
  }

  async entries(): Promise<{ name: string; status: string }[]> {
    await expect(this.cards.first()).toBeVisible();
    return this.cards.evaluateAll((cards) =>
      cards.map((card) => ({
        name: card.querySelector(".baker-name")?.textContent ?? "",
        status: card.querySelector(".baker-status")?.textContent ?? "",
      })),
    );
  }
}
