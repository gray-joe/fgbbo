# Fantasy Baking League: Product Spec

This document says what the product does and why. For how to run, build, and
call it, see [README.md](README.md).

## 1. Purpose

Users create private fantasy leagues for a baking competition series. Each
week they predict the official outcomes, and they earn points when the real
results are published. Leagues rank their members by points.

Goals:

- Let users create and join private leagues.
- Keep one shared set of official competition data for all leagues.
- Let users submit and revise weekly predictions until a deadline.
- Score predictions automatically when official results are published.
- Show clear standings and per-week score breakdowns.
- Give administrators the tools to manage official season data.

## 2. Roles

**System administrator**
- Manages seasons, contestants, weeks, and official results, in the Admin
  section of the web app.
- Can view all users, leagues, and predictions for support and moderation.
- Can read the audit trail of administrative changes.
- Cannot create or edit predictions on another user's behalf.
- Is set by server configuration, not in the app.

**League owner**
- Creates and configures a league for a season.
- Rotates the invite code, adds or removes members, transfers ownership, and
  archives the league.
- Has everything a member has.

**League member**
- Joins with an invite code and can leave (an owner must transfer ownership
  first).
- Sees the league's members, standings, and scores. Sees other members'
  predictions once the week's deadline has passed.

**Any signed-in user**, in a league or not, can create and edit their own
predictions before the deadline.

Anyone can register an account and request a login code. Everything else
requires being signed in.

## 3. Concepts

**User.** Has a unique email and a name. Deleting a user deactivates them:
they can't sign in and no longer appear in lookups, but their league
memberships, predictions, and scores remain. Login is by a one-time code sent
to their email; there are no passwords. A code works once, for 10 minutes, and
is cancelled after five wrong guesses. Sessions last 30 days, and logging out
ends the session immediately.

Other people never see a user's email. Users see themselves in full, and see
only the names of people they share a league with. Admins see everyone.

**Season.** One run of the competition, for example "Series 17". Only one
season is active at a time. Contestants, weeks, and leagues each belong to one
season, and seasons are never deleted, so history stays available.

**Contestant.** A baker in a season. Contestants are shared by every league in
that season. Once eliminated, they can't be picked again or used in a later
result.

**Week.** A numbered week in a season with a theme and a prediction deadline.
Week numbers are unique within a season.

**Official result.** The real outcome for a week. There is exactly one per
week, with four contestants: star baker, technical winner, the eliminated
baker, and weekly special. All four must belong to the week's season, and the
eliminated one must not already be eliminated. Publishing a result marks that
contestant as eliminated.

**League.** A private group for one season, with an owner and an invite code.
A user can be in any number of leagues. Invite codes are reusable until the
owner rotates the code, which stops the old code working immediately. Only the
owner and admins can see the code.

**Prediction.** A user's four picks for a week: star baker, technical winner,
who goes home, and weekly special. A user has one prediction per week, shared
by every league they belong to. Each league scores it separately. Picks must
be contestants from the week's season who aren't already eliminated.

## 4. Rules

### Predictions

- A user can edit their prediction as often as they like until the week
  locks. A week locks at its deadline, or as soon as its result is published,
  whichever comes first. After that, creating or changing a prediction is
  rejected.
- Picks are private until the week locks. Before then only the owner of the
  picks (and admins) can see them. After it, every member of a league can see
  the picks of their fellow members.
- Users can always see their own saved picks, including a pick for a baker
  who has since been eliminated.
- A missing prediction scores zero.

### Official results

- Only admins publish results.
- Publishing or correcting a result rescores every affected prediction in
  every league, in one step. A result is never visible without its scores.
- Publishing a result locks that week's picks, so nobody can predict once the
  answer is known. Deleting a result clears the week's scores, and reopens
  picks if the deadline hasn't passed.
- Publishing, correcting, and deleting a result each ask the admin to confirm
  first, and say what will happen to scores.

### Scoring

| Category | Points |
| --- | ---: |
| Star baker | 10 |
| Technical winner | 5 |
| Eliminated contestant | 10 |
| Weekly special | 3 |

- A wrong or missing pick scores zero for that category.
- A weekly score is the sum of the four categories.
- The overall score is the sum of weekly scores for every week with a
  published result in the league's season.
- Every score shows its per-category points, so any total can be checked.

### Standings

- Rank by total points, highest first. Break ties by the number of correct
  picks.
- Members tied on both share a rank, and the next rank skips ahead (two
  members at rank 1 means the next is rank 3).
- Every member appears, with zeros if they haven't predicted or no result
  exists yet.
- Members can see overall standings and a score breakdown for each week.
- Standings update whenever a result is published or corrected.

### Audit trail

- Every administrative change is recorded: who made it, when, what was sent,
  and what it applied to. That covers seasons, contestants, weeks, and
  results (including every publish, correction, and delete, which is how
  scoring changes are traced), and admin changes to users and leagues.
- Ordinary activity is not recorded: picks, joining or leaving a league,
  logging in, or an admin doing things any member can.
- Only successful changes are recorded, not rejected attempts.
- Only admins can read the trail. Entries can't be edited or deleted.
- A correction records only the fields that changed, so the trail shows what
  was actually corrected.

### Archived leagues

Archiving keeps memberships, predictions, scores, and standings, which stay
readable. The league becomes read-only: no renaming, joining, leaving, or new
predictions through it. A user's prediction can still be created or edited
outside the league, and through any other active league they belong to.

## 5. Quality expectations

- Login codes, session tokens, and invite codes are generated securely. Login
  never reveals whether an email is registered.
- Repeated requests for login codes, sign-ups, and code guesses are slowed down
  so they can't be used to spam people or guess codes.
- Only the web app's own address may call the API from a browser.
- Oversized requests are refused.
- Sensitive values stay out of logs, and errors never expose stack traces or
  database internals.
- Tests cover authorization, validation, deadlines, scoring, tie-breaking,
  result correction, and the audit trail.

## 6. Not built yet

- **User and league moderation screens.** Admins can act on users and leagues
  through the API only, and those actions are audited.
- **Atomic audit entries.** An entry is written right after the change, not in
  the same database transaction, so a crash between the two could lose one.

## 7. Acceptance criteria

- A user can sign in, create a league, and share its invite code.
- Another user can join with the active invite code.
- An administrator can create a season with its contestants and weeks.
- A user can submit and repeatedly edit all four picks before the deadline,
  and can't at or after it.
- Other members can't see a user's picks before the deadline.
- An administrator can publish exactly one valid result per week.
- Publishing a result awards 10, 5, 10, and 3 points for the four categories.
- Standings order members by points, then correct picks, and share a rank when
  both are tied.
- Correcting a result recalculates the affected scores.
- A league owner can rotate the invite code, and the old code stops working.
- Archiving a league keeps its history and makes it read-only.
- Once a result is published, nobody can create or change picks for that week.
- An administrator can publish, correct, and delete a week's result, and manage
  weeks, seasons, and bakers, without using the API directly.
- Every such change appears in the audit trail with who made it.
