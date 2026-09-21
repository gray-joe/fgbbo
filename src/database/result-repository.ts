import type { DatabaseSync } from "node:sqlite";

import type {
  CreateResultInput,
  Result,
  UpdateResultInput,
} from "../types/result";
import type { ScoreRepository } from "./score-repository";

export class ResultRepository {
  constructor(
    private readonly database: DatabaseSync,
    private readonly scores: ScoreRepository,
  ) {}

  list(pagination: { limit: number; cursor: number }): Result[] {
    return this.database
      .prepare(
        `SELECT id, week, star_baker, technical_winner, eliminated,
                weekly_special
         FROM results WHERE id > ? ORDER BY id LIMIT ?`,
      )
      .all(pagination.cursor, pagination.limit + 1) as unknown as Result[];
  }

  get(id: number): Result | undefined {
    return this.database
      .prepare(
        `SELECT id, week, star_baker, technical_winner, eliminated,
                weekly_special
         FROM results WHERE id = ?`,
      )
      .get(id) as unknown as Result | undefined;
  }

  getByWeek(week: number): Result | undefined {
    return this.database
      .prepare(
        `SELECT id, week, star_baker, technical_winner, eliminated,
                weekly_special
         FROM results WHERE week = ?`,
      )
      .get(week) as unknown as Result | undefined;
  }

  isContestantReferenced(contestantId: number): boolean {
    const row = this.database
      .prepare(
        `SELECT 1 FROM results
         WHERE star_baker = ? OR technical_winner = ?
            OR eliminated = ? OR weekly_special = ?
         LIMIT 1`,
      )
      .get(contestantId, contestantId, contestantId, contestantId);
    return row !== undefined;
  }

  create(input: CreateResultInput): Result {
    return this.withTransaction(() => {
      const result = this.database
        .prepare(
          `INSERT INTO results (
             week, star_baker, technical_winner, eliminated, weekly_special
           ) VALUES (?, ?, ?, ?, ?)`,
        )
        .run(
          input.week,
          input.star_baker,
          input.technical_winner,
          input.eliminated,
          input.weekly_special,
        );
      this.setContestantEliminated(input.eliminated, true);
      const created = this.get(Number(result.lastInsertRowid))!;
      this.scores.recalculateForWeek(input.week, created);
      return created;
    });
  }

  update(id: number, input: UpdateResultInput): Result | undefined {
    return this.withTransaction(() => {
      const previous = this.get(id);
      const result = this.database
        .prepare(
          `UPDATE results
           SET week = ?, star_baker = ?, technical_winner = ?,
               eliminated = ?, weekly_special = ?
           WHERE id = ?`,
        )
        .run(
          input.week,
          input.star_baker,
          input.technical_winner,
          input.eliminated,
          input.weekly_special,
          id,
        );
      if (result.changes === 0) {
        return undefined;
      }
      if (previous && previous.eliminated !== input.eliminated) {
        this.setContestantEliminated(previous.eliminated, false);
      }
      this.setContestantEliminated(input.eliminated, true);
      const updated = this.get(id)!;
      if (previous && previous.week !== input.week) {
        this.scores.recalculateForWeek(previous.week, undefined);
      }
      this.scores.recalculateForWeek(input.week, updated);
      return updated;
    });
  }

  delete(id: number): boolean {
    return this.withTransaction(() => {
      const existing = this.get(id);
      const result = this.database
        .prepare("DELETE FROM results WHERE id = ?")
        .run(id);
      if (result.changes > 0 && existing) {
        this.setContestantEliminated(existing.eliminated, false);
        this.scores.recalculateForWeek(existing.week, undefined);
      }
      return result.changes > 0;
    });
  }

  private setContestantEliminated(
    contestantId: number,
    eliminated: boolean,
  ): void {
    this.database
      .prepare("UPDATE contestants SET eliminated = ? WHERE id = ?")
      .run(Number(eliminated), contestantId);
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
}
