import { join } from "node:path";

import { AppDatabase } from "./database";

const CONTESTANT_NAMES = ["Alex", "Bo", "Casey", "Dana", "Elliot", "Frankie"];

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function seed(): void {
  const database = new AppDatabase(
    process.env.DATABASE_PATH ?? join(process.cwd(), "users.db"),
  );

  if (database.seasons.list({ limit: 1, cursor: 0 }).length > 0) {
    console.log("Database already has seed data (a season exists) — skipping.");
    console.log("Delete users.db and rerun to reseed from scratch.");
    database.close();
    return;
  }

  const season = database.seasons.create({
    name: "Bake Off Fantasy Test Season",
    active: true,
    starts_at: daysFromNow(-14),
    ends_at: null,
  });

  const contestants = CONTESTANT_NAMES.map((name) =>
    database.contestants.create({ name, eliminated: false, season_id: season.id }),
  );
  const [c1, c2, c3, c4, c5, c6] = contestants;

  const week1 = database.weeks.create({
    number: 1,
    theme: "Cake Week",
    season_id: season.id,
    prediction_deadline: daysFromNow(-7),
  });
  const week2 = database.weeks.create({
    number: 2,
    theme: "Biscuit Week",
    season_id: season.id,
    prediction_deadline: daysFromNow(-2),
  });
  const week3 = database.weeks.create({
    number: 3,
    theme: "Bread Week",
    season_id: season.id,
    prediction_deadline: daysFromNow(3),
  });

  database.results.create({
    week: week1.id,
    star_baker: c1.id,
    technical_winner: c2.id,
    eliminated: c6.id,
    weekly_special: c3.id,
  });
  database.results.create({
    week: week2.id,
    star_baker: c2.id,
    technical_winner: c3.id,
    eliminated: c5.id,
    weekly_special: c1.id,
  });

  console.log(`Seeded season "${season.name}" (id ${season.id}).`);
  console.log(`Contestants: ${contestants.map((c) => c.name).join(", ")}.`);
  console.log(
    `Weeks: ${week1.theme} and ${week2.theme} (aired, scored), ${week3.theme} (open for picks).`,
  );
  console.log(
    "No users or leagues were seeded — sign up, then create or join a league in the app.",
  );

  database.close();
}

seed();
