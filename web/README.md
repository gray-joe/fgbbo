# Web app

React, TypeScript, and Vite frontend for the Fantasy Baking League API. See
the [root README](../README.md) for the API and [SPEC.md](../SPEC.md) for the
product rules.

## Run

Start the API first (`npm start` in the repo root), then:

```bash
npm install
npm run dev
```

Vite serves the app at `http://localhost:5173`.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the built app |
| `npm run lint` | Run oxlint |

## Configuration

`VITE_API_URL` sets the API base URL. It defaults to `http://localhost:3000`.
To change it, put it in `web/.env.local`:

```
VITE_API_URL=http://localhost:3000
```

## Screens

- **Login**: enter an email, then the one-time code from the email. In
  development without `RESEND_API_KEY`, the code is printed in the API's
  console. If the server stops accepting the saved session (it expires after
  30 days), the app clears it and returns to login. Logging out also ends the
  session on the server.
- **Make Picks**: works on the active season and needs no league. Choose an
  episode from the strip, then one baker per category. Only bakers still in
  the competition are offered, except that a baker you already picked stays
  shown even if they have since left, so a locked episode shows your picks in
  full (including who you picked to go home). The episode shows when
  picks lock, in the browser's local time, or "Picks are locked". Saving
  creates the prediction, or updates it if one exists. The episode shows as
  locked once its deadline passes or its result is published.
- **Standings** (overall points only, no per-week breakdown): shows a league
  selector if the user is in more than one league, a bar per player, a "You"
  badge on the current user, and a scoring guide. The rank comes from the API,
  so tied players share a rank (1, 1, 3) and every rank-1 player gets a star. A
  member whose account was deleted shows as "Former member". If the user has
  no leagues, this tab shows the league gate instead, where they join with an
  invite code or create a league.
- **Bakers**: the active season's contestants in alphabetical order, each
  marked "Still baking" or "Eliminated".
- **Admin** (shown only to administrators, from `GET /auth/me`): four sections
  for the active season. **Results** publishes, corrects, or deletes a week's
  result, with a confirmation that says what will happen to scores (a
  correction sends only the fields that changed). **Weeks** adds, edits, and
  deletes weeks; deadlines use the browser's time zone. **Season & bakers**
  creates seasons, makes one active or ends it, and adds, renames, and removes
  bakers. **Activity** shows the audit trail, newest first, with a filter and
  Load more. The server checks admin access on every request, so hiding the
  tab is a convenience, not the protection.

## Code layout

- `src/api.ts`: fetch wrapper and typed endpoint calls. It adds the bearer
  token and turns error responses into `ApiError`.
- `src/App.tsx`: login state and tab navigation.
- `src/components/`: one file per screen. `admin/` holds the Admin sections
  (results, weeks, season and bakers, activity) and their shared helpers.

The bearer token and user are kept in `localStorage`, so a refresh keeps the
session.
