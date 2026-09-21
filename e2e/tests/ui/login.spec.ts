import { expect, test } from "../../fixtures";
import { Api } from "../../api/client";
import { newUser, uniqueEmail } from "../../api/world";
import { AppShell } from "../../pages/app-shell.page";
import { LoginPage } from "../../pages/login.page";
import { takeCode } from "../../support/mailbox";

// SPEC §3 User: sign up, one-time-code login, no passwords

test.describe("signing in", () => {
  test("a new user can create an account and sign in with the emailed code", async ({ page }) => {
    const login = new LoginPage(page);
    const shell = new AppShell(page);
    const email = uniqueEmail("newbie");

    await login.goto();
    await login.signUp("Nia Newbie", email);
    await expect(login.codePrompt).toContainText(email);
    await login.submitCode(takeCode(email));

    await expect(shell.tab("Make Picks")).toBeVisible();
    await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
  });

  test("an existing user signs in with a one-time code", async ({ page }) => {
    const user = await newUser("existing");
    const login = new LoginPage(page);

    await login.goto();
    await login.requestCode(user.email);
    await login.submitCode(takeCode(user.email));

    await expect(new AppShell(page).tab("Standings")).toBeVisible();
  });

  test("a wrong code is rejected and the user stays signed out", async ({ page }) => {
    const user = await newUser("wrongcode");
    const login = new LoginPage(page);

    await login.goto();
    await login.requestCode(user.email);
    const code = takeCode(user.email);
    await login.submitCode(code === "000000" ? "000001" : "000000");

    await expect(login.error).toHaveText("Invalid or expired code");
    await expect(new AppShell(page).nav).toBeHidden();
  });

  test("a used code can't be used again", async ({ page }) => {
    const user = await newUser("reuse");
    const login = new LoginPage(page);
    await login.goto();
    await login.requestCode(user.email);
    const code = takeCode(user.email);
    // Consume the code out-of-band, as if it had already been used.
    await new Api().must("POST", "/auth/login/verify", { email: user.email, code });

    await login.submitCode(code);
    await expect(login.error).toHaveText("Invalid or expired code");
  });

  test("asking for a code for an unknown email looks the same as for a real one", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.requestCode(uniqueEmail("nobody")); // still moves on to the code step

    await login.submitCode("123456");
    await expect(login.error).toHaveText("Invalid or expired code");
  });

  test("signing up with a taken email is rejected", async ({ page }) => {
    const user = await newUser("taken");
    const login = new LoginPage(page);
    await login.goto();
    await login.signUp("Someone Else", user.email);
    await expect(login.error).toHaveText("Email already exists");
  });

  test("the session survives a reload, and logging out ends it", async ({ page }) => {
    const user = await newUser("session");
    const login = new LoginPage(page);
    const shell = new AppShell(page);
    await login.goto();
    await login.requestCode(user.email);
    await login.submitCode(takeCode(user.email));
    await expect(shell.tab("Make Picks")).toBeVisible();

    await page.reload();
    await expect(shell.tab("Make Picks")).toBeVisible();

    await shell.logOut();
    await expect(page.getByRole("button", { name: "Send login code" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Send login code" })).toBeVisible();
  });

  test("logging out ends the session on the server too", async ({ signedInPage }) => {
    const user = await newUser("bye");
    const page = await signedInPage(user);
    const shell = new AppShell(page);
    await shell.goto();
    await expect(shell.tab("Make Picks")).toBeVisible();
    expect((await user.api.get("/leagues")).status).toBe(200);

    await shell.logOut();
    await expect(page.getByRole("button", { name: "Send login code" })).toBeVisible();

    await expect.poll(async () => (await user.api.get("/leagues")).status).toBe(401);
  });

  test("a token the server no longer accepts sends the user back to login", async ({ signedInPage }) => {
    const user = await newUser("stale");
    const page = await signedInPage({ ...user, token: "expired-or-revoked-token" });
    const shell = new AppShell(page);
    await shell.goto();

    await expect(page.getByRole("button", { name: "Send login code" })).toBeVisible();
    await expect(shell.nav).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
  });
});
