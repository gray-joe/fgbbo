import type { AppDatabase } from "../database";
import type { League } from "../types/league";

export function isLeagueMember(
  database: AppDatabase,
  league: League,
  userId: number,
): boolean {
  return (
    league.owner === userId || database.leaguePlayers.has(league.id, userId)
  );
}
