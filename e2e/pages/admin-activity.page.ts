import { expect, type Locator, type Page } from "@playwright/test";

import { openAdminSection } from "./admin-nav";

export interface ActivityRow {
  who: string;
  what: string;
  details: string;
}

export class AdminActivityPage {
  readonly rows: Locator;
  readonly loadMore: Locator;
  readonly filter: Locator;

  constructor(private readonly page: Page) {
    this.rows = page.locator(".admin-table tbody tr");
    this.loadMore = page.getByRole("button", { name: "Load more" });
    this.filter = page.getByLabel("Show");
  }

  async open() {
    await openAdminSection(this.page, "Activity");
    await expect(this.rows.first()).toBeVisible();
  }

  async entries(): Promise<ActivityRow[]> {
    return this.rows.evaluateAll((rows) =>
      rows.map((row) => {
        const cells = Array.from(row.querySelectorAll("td")).map((td) => td.textContent ?? "");
        return { who: cells[1], what: cells[2], details: cells[3] };
      }),
    );
  }

  async filterBy(entity: string) {
    await this.filter.selectOption(entity);
  }
}
