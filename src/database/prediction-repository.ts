import type { DatabaseSync } from "node:sqlite";

import type {
  CreatePredictionInput,
  Prediction,
  UpdatePredictionInput,
} from "../types/prediction";

interface PredictionRow {
  id: number;
  user_id: number;
  week_id: number;
  star_baker: number;
  technical_winner: number;
  eliminated: number;
  weekly_special: number;
  created_at: string;
  updated_at: string;
}

function toPrediction(row: PredictionRow): Prediction {
  return {
    id: row.id,
    user_id: row.user_id,
    week_id: row.week_id,
    star_baker: row.star_baker,
    technical_winner: row.technical_winner,
    eliminated: row.eliminated,
    weekly_special: row.weekly_special,
    created_at: new Date(`${row.created_at}Z`),
    updated_at: new Date(`${row.updated_at}Z`),
  };
}

const predictionColumns =
  `id, user_id, week_id, star_baker, technical_winner, ` +
  `eliminated, weekly_special, created_at, updated_at`;

export class PredictionRepository {
  constructor(private readonly database: DatabaseSync) {}

  /**
   * Predictions filed by any of `userIds`, e.g. the members of one league.
   * With `viewer`, only predictions that viewer may see: their own, plus
   * everyone's for weeks that are locked: deadline passed at `viewer.now`
   * (ISO), or a result already published.
   * Filtering here, not after paging, keeps pages full.
   */
  listForUsers(
    userIds: number[],
    pagination: { limit: number; cursor: number },
    weekId?: number,
    viewer?: { userId: number; now: string },
  ): Prediction[] {
    if (userIds.length === 0) {
      return [];
    }
    const placeholders = userIds.map(() => "?").join(", ");
    const weekClause = weekId ? "AND week_id = ?" : "";
    const viewerClause = viewer
      ? `AND (user_id = ? OR week_id IN
           (SELECT id FROM weeks WHERE prediction_deadline <= ?
            UNION SELECT week FROM results))`
      : "";
    const rows = this.database
      .prepare(
        `SELECT ${predictionColumns} FROM predictions
         WHERE user_id IN (${placeholders}) ${weekClause} ${viewerClause}
           AND id > ?
         ORDER BY id LIMIT ?`,
      )
      .all(
        ...userIds,
        ...(weekId ? [weekId] : []),
        ...(viewer ? [viewer.userId, viewer.now] : []),
        pagination.cursor,
        pagination.limit + 1,
      ) as unknown as PredictionRow[];
    return rows.map(toPrediction);
  }

  get(id: number): Prediction | undefined {
    const row = this.database
      .prepare(`SELECT ${predictionColumns} FROM predictions WHERE id = ?`)
      .get(id) as unknown as PredictionRow | undefined;
    return row ? toPrediction(row) : undefined;
  }

  getByUserWeek(userId: number, weekId: number): Prediction | undefined {
    const row = this.database
      .prepare(
        `SELECT ${predictionColumns} FROM predictions
         WHERE user_id = ? AND week_id = ?`,
      )
      .get(userId, weekId) as unknown as PredictionRow | undefined;
    return row ? toPrediction(row) : undefined;
  }

  create(input: CreatePredictionInput): Prediction {
    const result = this.database
      .prepare(
        `INSERT INTO predictions (
           user_id, week_id, star_baker, technical_winner,
           eliminated, weekly_special
         ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.user_id,
        input.week_id,
        input.star_baker,
        input.technical_winner,
        input.eliminated,
        input.weekly_special,
      );
    return this.get(Number(result.lastInsertRowid))!;
  }

  update(id: number, input: UpdatePredictionInput): Prediction | undefined {
    const result = this.database
      .prepare(
        `UPDATE predictions
         SET star_baker = ?, technical_winner = ?, eliminated = ?,
             weekly_special = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .run(
        input.star_baker,
        input.technical_winner,
        input.eliminated,
        input.weekly_special,
        id,
      );
    return result.changes === 0 ? undefined : this.get(id);
  }
}
