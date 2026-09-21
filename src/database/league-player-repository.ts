import type { DatabaseSync } from "node:sqlite";

import type { LeaguePlayer } from "../types/league-player";

export class LeaguePlayerRepository {
  constructor(private readonly database: DatabaseSync) {}

  list(
    leagueId: number,
    pagination: { limit: number; cursor: number },
  ): LeaguePlayer[] {
    return this.database
      .prepare(
        `SELECT league_id, user_id
         FROM league_players WHERE league_id = ? AND user_id > ?
         ORDER BY user_id LIMIT ?`,
      )
      .all(
        leagueId,
        pagination.cursor,
        pagination.limit + 1,
      ) as unknown as LeaguePlayer[];
  }

  listAll(leagueId: number): LeaguePlayer[] {
    return this.database
      .prepare(
        `SELECT league_id, user_id
         FROM league_players WHERE league_id = ? ORDER BY user_id`,
      )
      .all(leagueId) as unknown as LeaguePlayer[];
  }

  has(leagueId: number, userId: number): boolean {
    return Boolean(
      this.database
        .prepare(
          `SELECT 1 FROM league_players
           WHERE league_id = ? AND user_id = ?`,
        )
        .get(leagueId, userId),
    );
  }

  add(leagueId: number, userId: number): LeaguePlayer {
    this.database
      .prepare(
        "INSERT INTO league_players (league_id, user_id) VALUES (?, ?)",
      )
      .run(leagueId, userId);
    return { league_id: leagueId, user_id: userId };
  }

  remove(leagueId: number, userId: number): boolean {
    const result = this.database
      .prepare(
        "DELETE FROM league_players WHERE league_id = ? AND user_id = ?",
      )
      .run(leagueId, userId);
    return result.changes > 0;
  }
}
