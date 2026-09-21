import type { DatabaseSync } from "node:sqlite";

import type {
  CreateSeasonInput,
  Season,
  UpdateSeasonInput,
} from "../types/season";

interface SeasonRow {
  id: number;
  name: string;
  active: number;
  starts_at: string | null;
  ends_at: string | null;
}

function toSeason(row: SeasonRow): Season {
  return {
    id: row.id,
    name: row.name,
    active: Boolean(row.active),
    starts_at: row.starts_at ? new Date(`${row.starts_at}Z`) : null,
    ends_at: row.ends_at ? new Date(`${row.ends_at}Z`) : null,
  };
}

const seasonColumns = "id, name, active, starts_at, ends_at";

export class SeasonRepository {
  constructor(private readonly database: DatabaseSync) {}

  list(pagination: { limit: number; cursor: number }): Season[] {
    const rows = this.database
      .prepare(
        `SELECT ${seasonColumns} FROM seasons
         WHERE id > ? ORDER BY id LIMIT ?`,
      )
      .all(pagination.cursor, pagination.limit + 1) as unknown as SeasonRow[];
    return rows.map(toSeason);
  }

  get(id: number): Season | undefined {
    const row = this.database
      .prepare(`SELECT ${seasonColumns} FROM seasons WHERE id = ?`)
      .get(id) as unknown as SeasonRow | undefined;
    return row ? toSeason(row) : undefined;
  }

  private deactivateAll(): void {
    this.database.exec("UPDATE seasons SET active = 0");
  }

  private withTransaction<T>(work: () => T): T {
    this.database.exec("BEGIN");
    try {
      const value = work();
      this.database.exec("COMMIT");
      return value;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  create(input: CreateSeasonInput): Season {
    return this.withTransaction(() => {
      if (input.active) {
        this.deactivateAll();
      }
      const result = this.database
        .prepare(
          `INSERT INTO seasons (name, active, starts_at, ends_at)
           VALUES (?, ?, ?, ?)`,
        )
        .run(
          input.name,
          Number(input.active),
          input.starts_at ? input.starts_at.toISOString() : null,
          input.ends_at ? input.ends_at.toISOString() : null,
        );
      return this.get(Number(result.lastInsertRowid))!;
    });
  }

  update(id: number, input: UpdateSeasonInput): Season | undefined {
    return this.withTransaction(() => {
      if (input.active) {
        this.deactivateAll();
      }
      const result = this.database
        .prepare(
          `UPDATE seasons SET name = ?, active = ?, starts_at = ?, ends_at = ?
           WHERE id = ?`,
        )
        .run(
          input.name,
          Number(input.active),
          input.starts_at ? input.starts_at.toISOString() : null,
          input.ends_at ? input.ends_at.toISOString() : null,
          id,
        );
      return result.changes === 0 ? undefined : this.get(id);
    });
  }
}
