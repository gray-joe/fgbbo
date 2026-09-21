import { strict as assert } from "node:assert";
import { test } from "node:test";

import { auditTarget } from "../src/audit";
import type { AuthContext } from "../src/auth/context";

const auth = (isAdmin: boolean): AuthContext => ({
  isAdmin,
  user: {
    id: 1,
    name: "Ada",
    email: "ada@example.com",
    created_at: new Date(),
    active: true,
    deleted_at: null,
  },
});
const admin = auth(true);
const member = auth(false);

test("official data changes are audited, by verb", () => {
  assert.deepEqual(auditTarget("POST", "/seasons", admin), {
    entity: "seasons",
    entityId: undefined,
    action: "seasons.create",
  });
  assert.deepEqual(auditTarget("PATCH", "/weeks/7", admin), {
    entity: "weeks",
    entityId: 7,
    action: "weeks.update",
  });
  assert.deepEqual(auditTarget("DELETE", "/results/3", admin), {
    entity: "results",
    entityId: 3,
    action: "results.delete",
  });
  assert.equal(auditTarget("DELETE", "/contestants/9", admin)?.action, "contestants.delete");
});

test("reads are never audited", () => {
  for (const path of ["/seasons", "/weeks/7", "/results", "/users/1", "/leagues/2", "/audit-log"]) {
    assert.equal(auditTarget("GET", path, admin), undefined, path);
  }
});

test("users and leagues are audited only for admins", () => {
  for (const [method, path] of [
    ["PATCH", "/users/5"],
    ["DELETE", "/users/5"],
    ["PATCH", "/leagues/2"],
    ["POST", "/leagues/2/invite-code"],
    ["POST", "/leagues/2/players"],
    ["DELETE", "/leagues/2/players/8"],
  ]) {
    assert.ok(auditTarget(method, path, admin), `${method} ${path} as admin`);
    assert.equal(auditTarget(method, path, member), undefined, `${method} ${path} as member`);
  }
});

test("league actions get specific names", () => {
  assert.equal(auditTarget("POST", "/leagues/2/invite-code", admin)?.action, "leagues.rotate_invite_code");
  assert.equal(auditTarget("POST", "/leagues/2/players", admin)?.action, "leagues.add_player");
  assert.equal(auditTarget("DELETE", "/leagues/2/players/8", admin)?.action, "leagues.remove_player");
  assert.equal(auditTarget("DELETE", "/leagues/2", admin)?.action, "leagues.delete");
  assert.equal(auditTarget("POST", "/leagues/2/players/8", admin)?.entityId, 2);
});

test("an admin's own ordinary activity is not audited", () => {
  for (const [method, path] of [
    ["POST", "/predictions"],
    ["PATCH", "/weeks/3/prediction"],
    ["POST", "/leagues"],
    ["POST", "/leagues/join"],
    ["POST", "/leagues/2/predictions"],
    ["PATCH", "/leagues/2/weeks/3/prediction"],
    ["POST", "/users"],
    ["POST", "/auth/login"],
    ["DELETE", "/auth/logout"],
  ]) {
    assert.equal(auditTarget(method, path, admin), undefined, `${method} ${path}`);
  }
});
