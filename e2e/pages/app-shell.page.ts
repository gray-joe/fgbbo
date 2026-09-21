import { type Locator, type Page } from "@playwright/test";

export type Tab = "Make Picks" | "Standings" | "Bakers" | "Admin";

/** The signed-in frame: header, tabs, log out. */
export class AppShell {
  readonly nav: Locator;

  constructor(private readonly page: Page) {
    this.nav = page.locator("nav.tabs");
  }

  tab(name: Tab) {
    return this.nav.getByRole("button", { name });
  }

  async goto() {
    await this.page.goto("/");
  }

  async open(name: Tab) {
    await this.tab(name).click();
  }

  async logOut() {
    await this.page.getByRole("button", { name: "Log out" }).click();
  }
}
