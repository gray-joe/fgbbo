import { expect, type Locator, type Page } from "@playwright/test";

export class LoginPage {
  readonly error: Locator;
  readonly codePrompt: Locator;

  constructor(private readonly page: Page) {
    this.error = page.locator(".form-error");
    this.codePrompt = page.getByText("Enter the 6-digit code sent to");
  }

  async goto() {
    await this.page.goto("/");
    await expect(this.page.getByRole("button", { name: "Send login code" })).toBeVisible();
  }

  /** Email step: ask for a login code. Returns once the code step shows, i.e. the code has been sent. */
  async requestCode(email: string) {
    await this.page.getByLabel("Email").fill(email);
    await this.page.getByRole("button", { name: "Send login code" }).click();
    await expect(this.codePrompt).toBeVisible();
  }

  /** Code step: submit the code. */
  async submitCode(code: string) {
    await this.page.getByLabel("Code", { exact: true }).fill(code);
    await this.page.getByRole("button", { name: "Log in" }).click();
  }

  /** Sign-up step: register, which then moves on to the code step. */
  async signUp(name: string, email: string) {
    await this.page.getByRole("button", { name: "New here? Create an account" }).click();
    await this.page.getByLabel("Name").fill(name);
    await this.page.getByLabel("Email").fill(email);
    await this.page.getByRole("button", { name: "Create account" }).click();
  }
}
