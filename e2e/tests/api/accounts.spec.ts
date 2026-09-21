import { expect, test } from "../../fixtures";
import { Api } from "../../api/client";
import { createLeague, createSeason, joinLeague, login, newUser, standings, uniqueEmail } from "../../api/world";
import { API_URL } from "../../support/env";
import { hasCode, takeCode } from "../../support/mailbox";

// SPEC §2 Roles, §3 User, §5 Quality expectations

test.describe("accounts and login", () => {
  test("anyone can register, sign in with an emailed code, and act as themselves", async () => {
    const email = uniqueEmail("ada");
    const created = await new Api().post("/users", { name: "Ada", email });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: "Ada", email, active: true, deleted_at: null });

    const { token, user } = await login(email);
    expect(token).toBeTruthy();
    expect(user.id).toBe(created.body.id);
    const me = await new Api(token).get(`/users/${user.id}`);
    expect(me.status).toBe(200);
  });

  test("everything except registration and login requires being signed in", async () => {
    const anon = new Api();
    for (const path of ["/users", "/seasons", "/contestants", "/weeks", "/results", "/leagues"]) {
      const response = await anon.get(path);
      expect(response.status, path).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHENTICATED");
    }
    expect((await anon.get("/health")).status).toBe(200);
  });

  test("login never reveals whether an email is registered", async () => {
    const known = await newUser("known");
    const knownReply = await new Api().post("/auth/login", { email: known.email });
    takeCode(known.email);

    const unknownEmail = uniqueEmail("nobody");
    const unknownReply = await new Api().post("/auth/login", { email: unknownEmail });

    expect(unknownReply.status).toBe(knownReply.status);
    expect(unknownReply.body).toEqual(knownReply.body);
    expect(hasCode(unknownEmail)).toBe(false);
  });

  test("a wrong or reused code does not sign you in", async () => {
    const user = await newUser("codes");
    await new Api().must("POST", "/auth/login", { email: user.email });
    const code = takeCode(user.email);

    const wrong = await new Api().post("/auth/login/verify", {
      email: user.email,
      code: code === "000000" ? "000001" : "000000",
    });
    expect(wrong.status).toBe(401);

    const ok = await new Api().post("/auth/login/verify", { email: user.email, code });
    expect(ok.status).toBe(200);
    const reused = await new Api().post("/auth/login/verify", { email: user.email, code });
    expect(reused.status).toBe(401);
  });

  test("logging out invalidates the token", async () => {
    const user = await newUser("logout");
    expect((await user.api.get("/leagues")).status).toBe(200);
    expect((await user.api.delete("/auth/logout")).status).toBe(204);
    expect((await user.api.get("/leagues")).status).toBe(401);
  });

  test("/auth/me tells the app who is signed in and whether they are an admin", async ({ admin }) => {
    const ada = await newUser("ada");

    const asUser = await ada.api.get("/auth/me");
    expect(asUser.status).toBe(200);
    expect(asUser.body).toMatchObject({ is_admin: false, user: { id: ada.id, email: ada.email } });
    const asAdmin = await admin.api.get("/auth/me");
    expect(asAdmin.body).toMatchObject({ is_admin: true, user: { id: admin.id } });
    expect((await new Api().get("/auth/me")).status).toBe(401);
  });

  test("emails are unique, ignoring case", async () => {
    const email = uniqueEmail("dupe");
    await new Api().must("POST", "/users", { name: "First", email });
    const again = await new Api().post("/users", { name: "Second", email: email.toUpperCase() });
    expect(again.status).toBe(409);
  });

  test("users can update only their own account; admins can update anyone", async ({ admin }) => {
    const ada = await newUser("ada");
    const bo = await newUser("bo");

    expect((await ada.api.patch(`/users/${ada.id}`, { name: "Ada L" })).status).toBe(200);
    const other = await bo.api.patch(`/users/${ada.id}`, { name: "Hacked" });
    expect(other.status).toBe(403);
    expect((await admin.api.patch(`/users/${ada.id}`, { name: "Set by admin" })).status).toBe(200);
    expect((await ada.api.get(`/users/${ada.id}`)).body.name).toBe("Set by admin");
  });

  test("other people see only your name, and only if you share a league", async ({ admin }) => {
    const season = await createSeason(admin, 1);
    const ada = await newUser("ada");
    const bo = await newUser("bo");
    const stranger = await newUser("stranger");
    const league = await createLeague(ada, season);
    await joinLeague(bo, league.invite_code);

    // Yourself and admins: the full record.
    expect((await ada.api.get(`/users/${ada.id}`)).body.email).toBe(ada.email);
    expect((await admin.api.get(`/users/${ada.id}`)).body.email).toBe(ada.email);
    // A league-mate: id and name only.
    const seen = await bo.api.get(`/users/${ada.id}`);
    expect(seen.status).toBe(200);
    expect(seen.body).toEqual({ id: ada.id, name: ada.name });
    // A stranger can't tell the user exists.
    expect((await stranger.api.get(`/users/${ada.id}`)).status).toBe(404);

    const listed = await bo.api.list("/users");
    expect(listed.find((u) => u.id === ada.id)).toEqual({ id: ada.id, name: ada.name });
    expect(listed.find((u) => u.id === bo.id).email).toBe(bo.email);
    expect(listed.map((u) => u.id)).not.toContain(stranger.id);
    expect(JSON.stringify(listed)).not.toContain(ada.email);

    // Admins still see everyone, with emails.
    const all = await admin.api.list("/users");
    expect(all.find((u) => u.id === stranger.id).email).toBe(stranger.email);
  });

  test("administrators come from server configuration; a user can't promote themselves", async () => {
    const ada = await newUser("ada");
    await ada.api.patch(`/users/${ada.id}`, { admin: true, is_admin: true, role: "admin" });

    const attempt = await ada.api.post("/seasons", { name: "Mine now", active: false });
    expect(attempt.status).toBe(403);
  });

  test("deleting a user ends their access but keeps their league history", async ({ admin }) => {
    const owner = await newUser("owner");
    const leaver = await newUser("leaver");
    const season = await createSeason(admin, 1);
    const league = await createLeague(owner, season);
    await joinLeague(leaver, league.invite_code);

    expect((await leaver.api.delete(`/users/${leaver.id}`)).status).toBe(204);

    // Their token stops working, no login code is issued, and lookups no longer find them.
    expect((await leaver.api.get("/leagues")).status).toBe(401);
    await new Api().post("/auth/login", { email: leaver.email });
    expect(hasCode(leaver.email)).toBe(false);
    expect((await admin.api.get(`/users/${leaver.id}`)).status).toBe(404);

    // Their membership (and so their scores) remain in the league.
    const rows = await standings(owner, league.id);
    expect(rows.map((row) => row.user_id)).toContain(leaver.id);
  });

  test("errors use one body shape and never leak internals", async () => {
    const user = await newUser("errors");
    const badJson = await fetch(`${API_URL}/leagues`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
      body: "{not json",
    });
    expect(badJson.status).toBe(400);
    const body = await badJson.json();
    expect(body).toEqual({ error: { code: "INVALID_JSON", message: "Invalid JSON", details: {} } });

    const missing = await user.api.get("/leagues/999999");
    expect(missing.status).toBe(404);
    expect(Object.keys(missing.body.error).sort()).toEqual(["code", "details", "message"]);
    expect(JSON.stringify(missing.body)).not.toMatch(/stack|sqlite|at .*\.ts/i);
  });
});
