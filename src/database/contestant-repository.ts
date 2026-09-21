import type { DatabaseSync } from "node:sqlite";

import type {
  Contestant,
  CreateContestantInput,
  UpdateContestantInput,
} from "../types/contestant";

interface ContestantRow {
  id: number;
  name: string;
  eliminated: number;
  season_id: number;
}

function toContestant(row: ContestantRow): Contestant {
  return {
    id: row.id,
    name: row.name,
    eliminated: Boolean(row.eliminated),
    season_id: row.season_id,
  };
}

const contestantColumns = "id, name, eliminated, season_id";

export class ContestantRepository {
  constructor(private readonly database: DatabaseSync) {}

  list(
    pagination: { limit: number; cursor: number },
    seasonId?: number,
  ): Contestant[] {
    const rows = seasonId
      ? (this.database
          .prepare(
            `SELECT ${contestantColumns} FROM contestants
             WHERE season_id = ? AND id > ? ORDER BY id LIMIT ?`,
          )
          .all(
            seasonId,
            pagination.cursor,
            pagination.limit + 1,
          ) as unknown as ContestantRow[])
      : (this.database
          .prepare(
            `SELECT ${contestantColumns} FROM contestants
             WHERE id > ? ORDER BY id LIMIT ?`,
          )
          .all(
            pagination.cursor,
            pagination.limit + 1,
          ) as unknown as ContestantRow[]);
    return rows.map(toContestant);
  }

  get(id: number): Contestant | undefined {
    const row = this.database
      .prepare(`SELECT ${contestantColumns} FROM contestants WHERE id = ?`)
      .get(id) as unknown as ContestantRow | undefined;
    return row ? toContestant(row) : undefined;
  }

  create(input: CreateContestantInput): Contestant {
    const result = this.database
      .prepare(
        "INSERT INTO contestants (name, eliminated, season_id) VALUES (?, ?, ?)",
      )
      .run(input.name, Number(input.eliminated), input.season_id);
    return this.get(Number(result.lastInsertRowid))!;
  }

  update(id: number, input: UpdateContestantInput): Contestant | undefined {
    const result = this.database
      .prepare("UPDATE contestants SET name = ?, eliminated = ? WHERE id = ?")
      .run(input.name, Number(input.eliminated), id);
    return result.changes === 0 ? undefined : this.get(id);
  }

  delete(id: number): boolean {
    const result = this.database
      .prepare("DELETE FROM contestants WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }
}
