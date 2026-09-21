# Fantasy Baking League

A REST API built with Node.js, TypeScript, and SQLite, plus a React web app
in `web/`. Product rules (roles, predictions, scoring, standings) live in
[SPEC.md](SPEC.md). This file covers running, configuring, and calling the
API.

## Setup

Requires Node 22.5 or newer.

```bash
npm start      # build, then start the API at http://localhost:3000
npm run build  # compile TypeScript to dist/
npm run seed   # add a test season, contestants, and weeks (skips if a season exists)
npm test       # build and run the API integration tests (test/)
npm run test:e2e  # end-to-end tests with Playwright (see below)
```

CORS is open to any origin (`Access-Control-Allow-Origin: *`), so a frontend
on another port can call the API directly.

### Web app

The frontend lives in `web/`. See [web/README.md](web/README.md).

### Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `NODE_ENV` | Set to `production` when deployed (see below) | unset |
| `PORT` | API port | `3000` |
| `DATABASE_PATH` | SQLite file | `users.db` in the working directory |
| `ADMIN_EMAILS` | Comma-separated emails that act as administrators | none |
| `RESEND_API_KEY` | [Resend](https://resend.com) API key for login emails | unset |
| `EMAIL_FROM` | Sender, e.g. `Bake Off <login@example.com>`; required with the key | unset |
| `CORS_ORIGIN` | Comma-separated origins allowed to call the API from a browser | any origin |
| `TRUST_PROXY` | `true` when behind your own reverse proxy (see Deployment) | `false` |

There is no in-app way to promote an admin. Set `ADMIN_EMAILS` before
starting the server.

Copy `.env.example` to `.env` (which is git-ignored) and start with
`node --env-file=.env dist/src/server.js`. Never commit a real key.

With `NODE_ENV=production` the server refuses to start unless `RESEND_API_KEY`,
`EMAIL_FROM`, and `CORS_ORIGIN` are set. This stops a misconfigured deploy from
printing login codes to the log or accepting requests from any website.

## End-to-end tests

Playwright tests in `e2e/` check the behavior in [SPEC.md](SPEC.md) against
the running API and the web app. They are written in TypeScript.

```bash
npx playwright install chromium   # first time only
npm run test:e2e                  # run everything
npx playwright test --project=api # API tests only (no browser)
npx playwright test --project=ui  # browser tests only
npx playwright show-report        # open the last HTML report
npm run typecheck:e2e             # type-check the e2e code
```

You don't need to start anything first. Before any test runs, global setup
(`e2e/support/global-setup.ts`) starts the API on port 3100 with an in-memory
database and seeds it with `e2e/seed/dev-seed.ts`. Playwright starts the web
app on port 5273, pointed at that API. Neither touches your dev database or
ports.

- **Seed data:** admin, four players (Alice, Bob, Cara, Dan), one active
  season with six bakers and four weeks, and a league with known standings.
  Ids are written to `e2e/.tmp/seed.json` for the tests.
- **Login codes:** the test server writes them to `e2e/.tmp/mailbox/` instead
  of the console, and tests read them from there.
- **Page objects:** `e2e/pages/` has one class per screen. The UI tests use
  these and never write selectors inline.
- **API tests** (`e2e/tests/api/`) create their own inactive season, so they
  don't change the seeded data the UI tests read. Tests run one at a time
  because they share one database.
- **Layout:** `e2e/api/` is the HTTP client and data factories, `e2e/fixtures.ts`
  adds the `admin`, `seed`, and `signedInPage` fixtures.

## Deployment

- **Image:** the `Dockerfile` builds the API only. It runs as a non-root user,
  keeps the database in `/data` (mount a persistent volume there), and has a
  health check on `GET /health`. It has not been built in CI yet; check it on
  your first deploy.
- **One instance only.** SQLite is a single file and the rate limits are in
  memory, so don't run more than one copy.
- **Backups:** the database is one file. Take regular copies with
  `sqlite3 app.db ".backup backup.db"` (a plain file copy can catch it
  mid-write) and store them off the server.
- **TLS and proxy:** put the API behind an HTTPS reverse proxy. If the proxy
  sets `X-Forwarded-For`, set `TRUST_PROXY=true` so rate limits count real
  clients. Leave it `false` if the API is reachable directly, or clients could
  fake their address.
- **Email:** `EMAIL_FROM` must use a domain you have verified in Resend.
- **Shutdown:** the server finishes in-flight requests on `SIGTERM`, then exits.
- **Logs:** one line per request (method, path, status, time). No bodies,
  query strings, tokens, codes, or emails.
- **Web app:** build with `VITE_API_URL=https://api.example.com npm run build
  --prefix web` and serve `web/dist/` from any static host. Set `CORS_ORIGIN`
  on the API to that host's origin.
- **First admin:** put your email in `ADMIN_EMAILS`, register in the web app,
  and sign in. An Admin tab appears, where you manage seasons, bakers, weeks,
  and results, and read the audit trail.
- **CI:** `.github/workflows/ci.yml` runs the API tests, the e2e tests, and the
  web build on every push and pull request.

## Storage

- SQLite, with tables created automatically at startup.
- Foreign keys are enforced. Unique constraints back up the API validation:
  one result per week, one prediction per `(user, week)`, one membership per
  `(league, user)`, and week numbers unique within a season.
- Publishing a result, marking a contestant eliminated, and recalculating
  scores run in one transaction.
- Persistence code is in `src/database/`, one repository per table.

## Conventions

- JSON request and response bodies.
- IDs are numbers. Dates are ISO 8601 UTC strings.
- `POST` creates (`201`), `GET` reads, `PATCH` updates part of a resource,
  `DELETE` removes it (`204`), or archives it where history is kept.
- Status codes: `400` validation, `401` not signed in, `403` not allowed,
  `404` not found, `409` conflict or state error, `413` body too large,
  `429` too many requests (with a `Retry-After` header).

### Authentication

Login uses email and a one-time code, not a password. `POST /auth/login`
takes `{ "email" }`. If an active account exists, it generates a 6-digit code
(valid 10 minutes, single use) and delivers it. The response is always
`{ "message": "..." }`, whether or not the email is registered.

With `RESEND_API_KEY` set, the code is emailed through Resend. Sending happens
in the background, so the response is the same and just as fast for unknown
emails, and a failed send is logged without the key, code, or address. Without
a key (development only), the code is printed to the server console. You can
also pass your own `deliverLoginCode` in `ServerOptions`.

A code is cancelled after 5 wrong guesses. Sessions expire 30 days after login,
and `DELETE /auth/logout` ends one at once.

`POST /auth/login/verify` takes `{ "email", "code" }` and returns
`{ "token", "user" }`. Send the token as `Authorization: Bearer <token>` on
every other request.

Every endpoint needs the header except `GET /`, `GET /health`, `POST /users`,
`POST /auth/login`, and `POST /auth/login/verify`.

### Pagination

List endpoints take `limit` (default 20, max 100) and `cursor`, and respond
with:

```json
{
  "data": [],
  "pagination": { "next_cursor": null, "limit": 20 }
}
```

`cursor` is the `id` of the last item on the previous page (`user_id` for
league players). Pass `next_cursor` back as `cursor` for the next page.
`null` means no more results.

Filters run before paging, for example `GET /leagues` returning only the
caller's leagues and `GET /leagues/:id/predictions` returning only the
predictions the caller may see. Every page is full except the last.

### Limits

| What | Limit |
| --- | --- |
| `POST /auth/login` | 5 per email and 20 per IP, per 10 minutes |
| `POST /auth/login/verify` | 30 per IP, per 10 minutes |
| `POST /users` | 10 per IP, per hour |
| Request body | 100 KB (`413` above that) |

Limits are counted in memory, so they reset on restart and aren't shared
between instances. They apply only when the server is started from the command
line (`configFromEnv`); `createServer` has none unless you pass `rateLimits`.

### Errors

```json
{
  "error": {
    "code": "PREDICTION_LOCKED",
    "message": "Predictions for this week are locked",
    "details": {}
  }
}
```

## Endpoints

Access is noted where it isn't "any signed-in user". Admins can do anything
an owner or member can.

### General and auth

- `GET /` returns a greeting.
- `GET /health` returns the API status.
- `POST /auth/login` emails a one-time login code.
- `POST /auth/login/verify` exchanges an email and code for a token.
- `GET /auth/me` returns the signed-in `user` and `is_admin`.
- `DELETE /auth/logout` invalidates the caller's token.

### Users

- `GET /users` lists you and the people you share a league with (admins see
  everyone). Others appear as `{ id, name }` only; emails are never shown to
  anyone but the user and admins.
- `POST /users` registers a user.
- `GET /users/:id` returns a user, with the same visibility. A user you share
  no league with returns `404`.
- `PATCH /users/:id` updates a user (self or admin).
- `DELETE /users/:id` deactivates a user and sets `deleted_at` (self or admin).

### Seasons

- `GET /seasons` lists seasons.
- `POST /seasons` creates a season (admin).
- `GET /seasons/:id` returns a season.
- `PATCH /seasons/:id` updates a season (admin).

Setting `"active": true` on create or `PATCH` deactivates the previously
active season. End a season with `PATCH { "active": false }`. There is no
delete.

### Contestants

- `GET /contestants` lists contestants (optional `?season_id=`).
- `POST /contestants` creates a contestant (admin).
- `GET /contestants/:id` returns a contestant.
- `PATCH /contestants/:id` updates a contestant (admin).
- `DELETE /contestants/:id` deletes a contestant (admin).

### Weeks

- `GET /weeks` lists weeks (optional `?season_id=`).
- `POST /weeks` creates a week (admin).
- `GET /weeks/:id` returns a week.
- `PATCH /weeks/:id` updates a week (admin).
- `DELETE /weeks/:id` deletes a week (admin).

### Results

- `GET /results` lists results.
- `POST /results` publishes a result, scores predictions, and locks the week's
  picks (admin).
- `GET /results/:id` returns a result.
- `PATCH /results/:id` corrects a result and rescores (admin).
- `DELETE /results/:id` deletes a result and clears its scores (admin).

### Leagues

- `GET /leagues` lists the caller's leagues (admins see all).
- `POST /leagues` creates a league. The caller becomes owner and a member.
- `POST /leagues/join` joins a league by invite code.
- `GET /leagues/:id` returns a league (members or admin).
- `PATCH /leagues/:id` updates `name` and/or `owner` (owner or admin).
- `DELETE /leagues/:id` archives a league (owner or admin).
- `POST /leagues/:id/invite-code` rotates the invite code (owner or admin).
- `GET /leagues/:id/players` lists memberships (members or admin).
- `POST /leagues/:id/players` adds a user (owner or admin).
- `DELETE /leagues/:id/players/:userId` removes a member (self, or owner or
  admin removing someone else).

### Predictions

Predictions belong to a user and a week, not to a league. The two sets of
routes reach the same record.

- `POST /predictions` submits the caller's prediction for a week.
- `GET /weeks/:weekId/prediction` returns the caller's prediction.
- `PATCH /weeks/:weekId/prediction` edits it.
- `GET /leagues/:id/predictions` lists league members' predictions (members or
  admin; optional `?week_id=`; other people's picks only appear after the
  deadline).
- `POST /leagues/:id/predictions` same as `POST /predictions` (members only).
- `GET /leagues/:id/weeks/:weekId/prediction` returns the caller's prediction.
- `PATCH /leagues/:id/weeks/:weekId/prediction` edits it.

Creating or editing after the deadline, or once the week's result is
published, returns `409 PREDICTION_LOCKED`. Deleting the result reopens picks if
the deadline is still ahead.
Creating a second prediction for the same week returns `409 CONFLICT`. The
league routes also return `409` for an archived league.

### Audit trail

- `GET /audit-log` lists administrative changes, newest first (admin only).
  Filters: `entity` (`seasons`, `contestants`, `weeks`, `results`, `users`,
  `leagues`), `entity_id`, `actor_id`. `cursor` is the id of the last entry
  you have seen, and the next page holds older entries.

Each entry has `id`, `at`, `actor_id`, `actor_email`, `method`, `path`,
`action` (such as `results.update`), `entity`, `entity_id`, `status`, and the
request `body` as it was sent.

What is recorded, from one place in `server.ts` (`src/audit.ts`), after a
successful request:

- Any `POST`, `PATCH`, or `DELETE` on `/seasons`, `/contestants`, `/weeks`,
  and `/results`.
- The same on `/users/:id` and on `/leagues/:id` (including invite-code
  rotation and players), but only when the caller is an admin.

Not recorded: reads, rejected requests, picks, joining or leaving a league,
logins, and an admin's own ordinary activity. The table is append-only and no
route changes or deletes entries. The email is stored with each entry, because
admins are set by configuration and users can be deleted.

An entry is written right after the change in the same tick, not in the same
database transaction. A crash in between could lose an entry, and a failure to
write is logged and not shown to the client.

### Standings and scores

- `GET /leagues/:id/standings` returns overall standings (members or admin).
- `GET /leagues/:id/weeks/:weekId/scores` returns one week's scores and
  ranking (members or admin).

Both return every league member:

```json
{
  "data": [
    {
      "user_id": 2,
      "star_baker_points": 10,
      "technical_winner_points": 5,
      "eliminated_points": 10,
      "weekly_special_points": 3,
      "total_points": 28,
      "correct_predictions": 4,
      "rank": 1
    }
  ],
  "pagination": { "next_cursor": null, "limit": 20 }
}
```

## Request bodies

Users. `PATCH` accepts any of `name`, `email`, and `active`. Responses include
`created_at`, `active`, and a nullable `deleted_at`.

```json
{ "name": "Ada Lovelace", "email": "ada@example.com" }
```

Contestants. `season_id` is required on create and can't be changed. `PATCH`
accepts `name` and `eliminated`.

```json
{ "name": "Alice", "eliminated": false, "season_id": 1 }
```

Weeks. `season_id` and `prediction_deadline` are required on create. `PATCH`
accepts `number`, `theme`, and `prediction_deadline`.

```json
{
  "number": 1,
  "theme": "Premiere",
  "season_id": 1,
  "prediction_deadline": "2026-01-01T18:00:00.000Z"
}
```

Results. `PATCH` accepts any of the same fields.

```json
{
  "week": 1,
  "star_baker": 1,
  "technical_winner": 2,
  "eliminated": 3,
  "weekly_special": 4
}
```

Predictions.

```json
{
  "week_id": 1,
  "star_baker": 1,
  "technical_winner": 2,
  "eliminated": 3,
  "weekly_special": 4
}
```

Leagues. The `invite_code` in league responses is `null` unless the caller is
the owner or an admin. `archived_at` is set once archived. Transferring
`owner` requires the new owner to already be a member.

```json
{ "name": "Premier League", "season_id": 1 }
```

Joining a league, and adding a player directly:

```json
{ "invite_code": "a1b2c3d4e5f6" }
```

```json
{ "user_id": 2 }
```
