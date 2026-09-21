import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { after, test } from "node:test";

import { configFromEnv } from "../src/config";
import { createResendDeliverer } from "../src/email/resend";
import { DEFAULT_RATE_LIMITS } from "../src/http/rate-limit";
import { createServer, type ServerOptions } from "../src/server";

const servers: Server[] = [];
const tempDirs: string[] = [];

after(async () => {
  await Promise.all(
    servers.map((s) => new Promise((resolve) => { s.close(resolve); s.closeAllConnections(); })),
  );
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

/** Starts a server on a free port. Login codes are captured in `codes`. */
async function start(options: ServerOptions = {}) {
  const codes = new Map<string, string>();
  const server = createServer({
    databasePath: ":memory:",
    deliverLoginCode: (email, code) => codes.set(email, code),
    ...options,
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  return { codes, call, baseUrl };
}

// --- email delivery ---

test("login codes are emailed through Resend without leaking secrets", async () => {
  const requests: { url: string; init: RequestInit }[] = [];
  const logged: string[] = [];
  const deliver = createResendDeliverer({
    apiKey: "re_secret_key",
    from: "Bake Off <login@example.com>",
    fetchImpl: (async (url: string, init: RequestInit) => {
      requests.push({ url, init });
      return new Response(JSON.stringify({ id: "1" }), { status: 200 });
    }) as typeof fetch,
    onError: (message) => logged.push(message),
  });

  deliver("ada@example.com", "123456");
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://api.resend.com/emails");
  assert.equal(requests[0].init.method, "POST");
  const headers = requests[0].init.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer re_secret_key");
  const body = JSON.parse(String(requests[0].init.body));
  assert.equal(body.from, "Bake Off <login@example.com>");
  assert.deepEqual(body.to, ["ada@example.com"]);
  assert.match(body.text, /123456/);
  assert.deepEqual(logged, []);
});

test("a failed Resend call is logged without the key, code, or address, and never throws", async () => {
  const logged: string[] = [];
  const deliver = createResendDeliverer({
    apiKey: "re_secret_key",
    from: "login@example.com",
    fetchImpl: (async () => new Response("nope", { status: 403 })) as unknown as typeof fetch,
    onError: (message) => logged.push(message),
  });

  assert.doesNotThrow(() => deliver("ada@example.com", "654321"));
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.equal(logged.length, 1);
  assert.match(logged[0], /403/);
  for (const secret of ["re_secret_key", "654321", "ada@example.com"]) {
    assert.ok(!logged[0].includes(secret), `log leaked ${secret}`);
  }
});

test("a network error while sending is also contained", async () => {
  const logged: string[] = [];
  const deliver = createResendDeliverer({
    apiKey: "k",
    from: "a@example.com",
    fetchImpl: (async () => { throw new Error("socket hang up"); }) as unknown as typeof fetch,
    onError: (message) => logged.push(message),
  });
  deliver("ada@example.com", "111111");
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(logged.length, 1);
});

// --- configuration ---

test("production refuses to start without email and CORS settings", () => {
  assert.throws(
    () => configFromEnv({ NODE_ENV: "production" }),
    /RESEND_API_KEY, CORS_ORIGIN/,
  );
  assert.throws(
    () => configFromEnv({ NODE_ENV: "production", RESEND_API_KEY: "k", CORS_ORIGIN: "https://a.example" }),
    /EMAIL_FROM/,
  );
  const config = configFromEnv({
    NODE_ENV: "production",
    RESEND_API_KEY: "k",
    EMAIL_FROM: "login@example.com",
    CORS_ORIGIN: "https://a.example/, https://b.example",
    PORT: "8080",
  });
  assert.equal(config.port, 8080);
  assert.deepEqual(config.corsOrigins, ["https://a.example", "https://b.example"]);
  assert.ok(config.deliverLoginCode);
  assert.ok(config.rateLimits);
});

test("development starts with no email provider and allows any origin", () => {
  const config = configFromEnv({});
  assert.equal(config.deliverLoginCode, undefined);
  assert.equal(config.corsOrigins, undefined);
});

// --- login code attempts ---

test("a login code is burned after five wrong guesses", async () => {
  const { call, codes } = await start();
  await call("POST", "/users", { name: "Ada", email: "ada@example.com" });
  await call("POST", "/auth/login", { email: "ada@example.com" });
  const code = codes.get("ada@example.com")!;
  const wrong = code === "000000" ? "000001" : "000000";

  for (let i = 0; i < 5; i++) {
    const response = await call("POST", "/auth/login/verify", { email: "ada@example.com", code: wrong });
    assert.equal(response.status, 401);
  }
  // Even the right code no longer works.
  const late = await call("POST", "/auth/login/verify", { email: "ada@example.com", code });
  assert.equal(late.status, 401);

  // A fresh code starts a fresh count.
  await call("POST", "/auth/login", { email: "ada@example.com" });
  const fresh = await call("POST", "/auth/login/verify", {
    email: "ada@example.com",
    code: codes.get("ada@example.com")!,
  });
  assert.equal(fresh.status, 200);
});

test("four wrong guesses do not stop the right code working", async () => {
  const { call, codes } = await start();
  await call("POST", "/users", { name: "Bo", email: "bo@example.com" });
  await call("POST", "/auth/login", { email: "bo@example.com" });
  const code = codes.get("bo@example.com")!;
  const wrong = code === "000000" ? "000001" : "000000";
  for (let i = 0; i < 4; i++) {
    await call("POST", "/auth/login/verify", { email: "bo@example.com", code: wrong });
  }
  const ok = await call("POST", "/auth/login/verify", { email: "bo@example.com", code });
  assert.equal(ok.status, 200);
});

// --- rate limits ---

test("asking for login codes is limited per email, the same for unknown addresses", async () => {
  const { call, codes } = await start({ rateLimits: DEFAULT_RATE_LIMITS });
  await call("POST", "/users", { name: "Ada", email: "ada@example.com" });

  for (const email of ["ada@example.com", "nobody@example.com"]) {
    for (let i = 0; i < 5; i++) {
      assert.equal((await call("POST", "/auth/login", { email })).status, 200);
    }
    const limited = await call("POST", "/auth/login", { email });
    assert.equal(limited.status, 429, email);
    assert.ok(Number(limited.headers.get("retry-after")) >= 1);
    const body = (await limited.json()) as { error: { code: string } };
    assert.equal(body.error.code, "RATE_LIMITED");
  }
  assert.ok(codes.has("ada@example.com"));
  assert.ok(!codes.has("nobody@example.com"));
});

test("sign-ups and login attempts are limited per client address", async () => {
  const { call } = await start({
    rateLimits: {
      ...DEFAULT_RATE_LIMITS,
      signupPerIp: { max: 3, windowMs: 60_000 },
      verifyPerIp: { max: 2, windowMs: 60_000 },
    },
  });
  for (let i = 0; i < 3; i++) {
    assert.equal((await call("POST", "/users", { name: "U", email: `u${i}@example.com` })).status, 201);
  }
  assert.equal((await call("POST", "/users", { name: "U", email: "u9@example.com" })).status, 429);

  for (let i = 0; i < 2; i++) {
    assert.equal((await call("POST", "/auth/login/verify", { email: "a@example.com", code: "000000" })).status, 401);
  }
  assert.equal((await call("POST", "/auth/login/verify", { email: "a@example.com", code: "000000" })).status, 429);
});

test("with a trusted proxy, limits follow the forwarded client address", async () => {
  const { call } = await start({
    trustProxy: true,
    rateLimits: { ...DEFAULT_RATE_LIMITS, signupPerIp: { max: 1, windowMs: 60_000 } },
  });
  const signup = (ip: string, n: number) =>
    call("POST", "/users", { name: "U", email: `p${n}@example.com` }, { "X-Forwarded-For": `10.9.9.9, ${ip}` });

  assert.equal((await signup("1.1.1.1", 1)).status, 201);
  assert.equal((await signup("1.1.1.1", 2)).status, 429);
  assert.equal((await signup("2.2.2.2", 3)).status, 201);
});

test("other routes are not rate limited", async () => {
  const { call } = await start({
    rateLimits: { ...DEFAULT_RATE_LIMITS, signupPerIp: { max: 1, windowMs: 60_000 } },
  });
  for (let i = 0; i < 20; i++) {
    assert.equal((await call("GET", "/health")).status, 200);
  }
});

// --- request size ---

test("oversized request bodies are rejected with 413", async () => {
  const { call } = await start();
  const response = await call("POST", "/users", { name: "x".repeat(200 * 1024), email: "a@example.com" });
  assert.equal(response.status, 413);
  const body = (await response.json()) as { error: { code: string } };
  assert.equal(body.error.code, "PAYLOAD_TOO_LARGE");

  // Normal requests still work on the next connection.
  assert.equal((await call("POST", "/users", { name: "Ada", email: "ada@example.com" })).status, 201);
});

// --- CORS ---

test("with allowed origins set, only those origins get CORS access", async () => {
  const { call } = await start({ corsOrigins: ["https://app.example"] });

  const allowed = await call("GET", "/health", undefined, { Origin: "https://app.example" });
  assert.equal(allowed.headers.get("access-control-allow-origin"), "https://app.example");
  assert.equal(allowed.headers.get("vary"), "Origin");

  const other = await call("GET", "/health", undefined, { Origin: "https://evil.example" });
  assert.equal(other.headers.get("access-control-allow-origin"), null);
  const none = await call("GET", "/health");
  assert.equal(none.headers.get("access-control-allow-origin"), null);
});

test("with no allowed origins configured, any origin is allowed (development)", async () => {
  const { call } = await start();
  const response = await call("GET", "/health", undefined, { Origin: "http://localhost:5173" });
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

// --- sessions ---

test("sessions stop working after 30 days", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fgbbo-"));
  tempDirs.push(dir);
  const databasePath = join(dir, "test.db");
  const { call, codes } = await start({ databasePath });
  await call("POST", "/users", { name: "Ada", email: "ada@example.com" });
  await call("POST", "/auth/login", { email: "ada@example.com" });
  const { token } = (await (
    await call("POST", "/auth/login/verify", { email: "ada@example.com", code: codes.get("ada@example.com")! })
  ).json()) as { token: string };
  const auth = { Authorization: `Bearer ${token}` };
  assert.equal((await call("GET", "/leagues", undefined, auth)).status, 200);

  // Age the session: 29 days old still works, 31 days old does not.
  const db = new DatabaseSync(databasePath);
  const setAge = (days: number) =>
    db.prepare("UPDATE sessions SET created_at = datetime('now', ?)").run(`-${days} days`);
  setAge(29);
  assert.equal((await call("GET", "/leagues", undefined, auth)).status, 200);
  setAge(31);
  assert.equal((await call("GET", "/leagues", undefined, auth)).status, 401);
  db.close();
});

test("expired sessions are cleaned up when someone signs in", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fgbbo-"));
  tempDirs.push(dir);
  const databasePath = join(dir, "test.db");
  const { call, codes } = await start({ databasePath });
  await call("POST", "/users", { name: "Ada", email: "ada@example.com" });
  const signIn = async () => {
    await call("POST", "/auth/login", { email: "ada@example.com" });
    await call("POST", "/auth/login/verify", { email: "ada@example.com", code: codes.get("ada@example.com")! });
  };
  await signIn();
  const db = new DatabaseSync(databasePath);
  db.prepare("UPDATE sessions SET created_at = datetime('now', '-40 days')").run();
  await signIn();
  const remaining = db.prepare("SELECT COUNT(*) AS n FROM sessions").get() as { n: number };
  assert.equal(remaining.n, 1);
  db.close();
});
