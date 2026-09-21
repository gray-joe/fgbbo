import type { DatabaseSync } from "node:sqlite";

import { generateInviteCode } from "../auth/tokens";

const LEGACY_DEADLINE = "1970-01-01T00:00:00.000Z";

function tableColumns(database: DatabaseSync, table: string): string[] {
  const rows = database.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
  }[];
  return rows.map((row) => row.name);
}

function addColumnIfMissing(
  database: DatabaseSync,
  table: string,
  column: string,
  definition: string,
  existingColumns: string[],
): void {
  if (!existingColumns.includes(column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function getOrCreateLegacySeasonId(database: DatabaseSync): number {
  const existing = database
    .prepare("SELECT id FROM seasons WHERE name = ?")
    .get("Legacy Season") as { id: number } | undefined;
  if (existing) {
    return existing.id;
  }
  const result = database
    .prepare("INSERT INTO seasons (name, active) VALUES (?, 0)")
    .run("Legacy Season");
  return Number(result.lastInsertRowid);
}

export function initializeSchema(database: DatabaseSync): void {
  database.exec("PRAGMA foreign_keys = ON");

  database.exec(`
    CREATE TABLE IF NOT EXISTS seasons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 0,
      starts_at TEXT,
      ends_at TEXT
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS contestants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      eliminated INTEGER NOT NULL,
      season_id INTEGER REFERENCES seasons(id)
    )
  `);
  addColumnIfMissing(
    database,
    "contestants",
    "season_id",
    "INTEGER REFERENCES seasons(id)",
    tableColumns(database, "contestants"),
  );

  database.exec(`
    CREATE TABLE IF NOT EXISTS weeks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER NOT NULL,
      theme TEXT NOT NULL,
      season_id INTEGER REFERENCES seasons(id),
      prediction_deadline TEXT
    )
  `);
  const weekColumns = tableColumns(database, "weeks");
  addColumnIfMissing(
    database,
    "weeks",
    "season_id",
    "INTEGER REFERENCES seasons(id)",
    weekColumns,
  );
  addColumnIfMissing(
    database,
    "weeks",
    "prediction_deadline",
    "TEXT",
    weekColumns,
  );
  database.exec("DROP INDEX IF EXISTS idx_weeks_number");

  database.exec(`
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week INTEGER NOT NULL,
      star_baker INTEGER NOT NULL,
      technical_winner INTEGER NOT NULL,
      eliminated INTEGER NOT NULL,
      weekly_special INTEGER NOT NULL,
      FOREIGN KEY (week) REFERENCES weeks(id),
      FOREIGN KEY (star_baker) REFERENCES contestants(id),
      FOREIGN KEY (technical_winner) REFERENCES contestants(id),
      FOREIGN KEY (eliminated) REFERENCES contestants(id),
      FOREIGN KEY (weekly_special) REFERENCES contestants(id)
    )
  `);
  database.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_results_week ON results(week)",
  );

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      active INTEGER NOT NULL DEFAULT 1,
      deleted_at TEXT
    )
  `);

  const userColumns = tableColumns(database, "users");
  addColumnIfMissing(
    database,
    "users",
    "active",
    "INTEGER NOT NULL DEFAULT 1",
    userColumns,
  );
  addColumnIfMissing(database, "users", "deleted_at", "TEXT", userColumns);

  database.exec(`
    CREATE TABLE IF NOT EXISTS login_codes (
      email TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0
    )
  `);
  addColumnIfMissing(
    database,
    "login_codes",
    "attempts",
    "INTEGER NOT NULL DEFAULT 0",
    tableColumns(database, "login_codes"),
  );

  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS leagues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      owner INTEGER NOT NULL,
      season_id INTEGER REFERENCES seasons(id),
      archived_at TEXT,
      invite_code TEXT,
      FOREIGN KEY (owner) REFERENCES users(id)
    )
  `);

  const leagueColumns = tableColumns(database, "leagues");
  addColumnIfMissing(
    database,
    "leagues",
    "season_id",
    "INTEGER REFERENCES seasons(id)",
    leagueColumns,
  );
  addColumnIfMissing(database, "leagues", "archived_at", "TEXT", leagueColumns);
  addColumnIfMissing(database, "leagues", "invite_code", "TEXT", leagueColumns);

  const leaguesMissingCode = database
    .prepare("SELECT id FROM leagues WHERE invite_code IS NULL")
    .all() as { id: number }[];
  for (const { id } of leaguesMissingCode) {
    let code = generateInviteCode();
    while (
      database
        .prepare("SELECT 1 FROM leagues WHERE invite_code = ?")
        .get(code)
    ) {
      code = generateInviteCode();
    }
    database
      .prepare("UPDATE leagues SET invite_code = ? WHERE id = ?")
      .run(code, id);
  }
  database.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_leagues_invite_code ON leagues(invite_code)",
  );

  const needsLegacyBackfill =
    database
      .prepare(
        "SELECT 1 FROM contestants WHERE season_id IS NULL " +
          "UNION SELECT 1 FROM weeks WHERE season_id IS NULL " +
          "UNION SELECT 1 FROM leagues WHERE season_id IS NULL",
      )
      .get() !== undefined;
  if (needsLegacyBackfill) {
    const legacySeasonId = getOrCreateLegacySeasonId(database);
    database
      .prepare("UPDATE contestants SET season_id = ? WHERE season_id IS NULL")
      .run(legacySeasonId);
    database
      .prepare("UPDATE weeks SET season_id = ? WHERE season_id IS NULL")
      .run(legacySeasonId);
    database
      .prepare("UPDATE leagues SET season_id = ? WHERE season_id IS NULL")
      .run(legacySeasonId);
  }
  database
    .prepare(
      "UPDATE weeks SET prediction_deadline = ? WHERE prediction_deadline IS NULL",
    )
    .run(LEGACY_DEADLINE);

  database.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_weeks_season_number ON weeks(season_id, number)",
  );

  database.exec(`
    CREATE TABLE IF NOT EXISTS league_players (
      league_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      PRIMARY KEY (league_id, user_id),
      FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      week_id INTEGER NOT NULL,
      star_baker INTEGER NOT NULL,
      technical_winner INTEGER NOT NULL,
      eliminated INTEGER NOT NULL,
      weekly_special INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (week_id) REFERENCES weeks(id),
      FOREIGN KEY (star_baker) REFERENCES contestants(id),
      FOREIGN KEY (technical_winner) REFERENCES contestants(id),
      FOREIGN KEY (eliminated) REFERENCES contestants(id),
      FOREIGN KEY (weekly_special) REFERENCES contestants(id)
    )
  `);
  database.exec("DROP INDEX IF EXISTS idx_predictions_league_user_week");
  if (
    tableColumns(database, "predictions").includes("league_id")
  ) {
    database.exec("ALTER TABLE predictions DROP COLUMN league_id");
  }
  database.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_predictions_user_week " +
      "ON predictions(user_id, week_id)",
  );

  database.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      league_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      week_id INTEGER NOT NULL,
      star_baker_points INTEGER NOT NULL,
      technical_winner_points INTEGER NOT NULL,
      eliminated_points INTEGER NOT NULL,
      weekly_special_points INTEGER NOT NULL,
      total_points INTEGER NOT NULL,
      correct_predictions INTEGER NOT NULL,
      FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (week_id) REFERENCES weeks(id)
    )
  `);
  database.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_league_user_week " +
      "ON scores(league_id, user_id, week_id)",
  );

  // Append-only: nothing in the app updates or deletes rows here.
  database.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT NOT NULL,
      actor_id INTEGER NOT NULL,
      actor_email TEXT NOT NULL,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER,
      status INTEGER NOT NULL,
      body TEXT
    )
  `);
  database.exec(
    "CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity, entity_id)",
  );
}
