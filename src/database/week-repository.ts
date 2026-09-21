import type { DatabaseSync } from "node:sqlite";

import type {
  CreateWeekInput,
  UpdateWeekInput,
  Week,
} from "../types/week";

interface WeekRow {
  id: number;
  number: number;
  theme: string;
  season_id: number;
  prediction_deadline: string;
}

function toWeek(row: WeekRow): Week {
  return {
    id: row.id,
    number: row.number,
    theme: row.theme,
    season_id: row.season_id,
    prediction_deadline: new Date(row.prediction_deadline),
  };
}

const weekColumns = "id, number, theme, season_id, prediction_deadline";

export class WeekRepository {
  constructor(private readonly database: DatabaseSync) {}

  list(
    pagination: { limit: number; cursor: number },
    seasonId?: number,
  ): Week[] {
    const rows = seasonId
      ? (this.database
          .prepare(
            `SELECT ${weekColumns} FROM weeks
             WHERE season_id = ? AND id > ? ORDER BY id LIMIT ?`,
          )
          .all(
            seasonId,
            pagination.cursor,
            pagination.limit + 1,
          ) as unknown as WeekRow[])
      : (this.database
          .prepare(
            `SELECT ${weekColumns} FROM weeks
             WHERE id > ? ORDER BY id LIMIT ?`,
          )
          .all(
            pagination.cursor,
            pagination.limit + 1,
          ) as unknown as WeekRow[]);
    return rows.map(toWeek);
  }

  get(id: number): Week | undefined {
    const row = this.database
      .prepare(`SELECT ${weekColumns} FROM weeks WHERE id = ?`)
      .get(id) as unknown as WeekRow | undefined;
    return row ? toWeek(row) : undefined;
  }

  getByNumber(seasonId: number, number: number): Week | undefined {
    const row = this.database
      .prepare(
        `SELECT ${weekColumns} FROM weeks WHERE season_id = ? AND number = ?`,
      )
      .get(seasonId, number) as unknown as WeekRow | undefined;
    return row ? toWeek(row) : undefined;
  }

  create(input: CreateWeekInput): Week {
    const result = this.database
      .prepare(
        `INSERT INTO weeks (number, theme, season_id, prediction_deadline)
         VALUES (?, ?, ?, ?)`,
      )
      .run(
        input.number,
        input.theme,
        input.season_id,
        input.prediction_deadline.toISOString(),
      );
    return this.get(Number(result.lastInsertRowid))!;
  }

  update(id: number, input: UpdateWeekInput): Week | undefined {
    const result = this.database
      .prepare(
        `UPDATE weeks SET number = ?, theme = ?, prediction_deadline = ?
         WHERE id = ?`,
      )
      .run(
        input.number,
        input.theme,
        input.prediction_deadline.toISOString(),
        id,
      );
    return result.changes === 0 ? undefined : this.get(id);
  }

  delete(id: number): boolean {
    const result = this.database.prepare("DELETE FROM weeks WHERE id = ?").run(id);
    return result.changes > 0;
  }
}
