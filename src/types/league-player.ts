export interface LeaguePlayer {
  league_id: number;
  user_id: number;
}

export type AddLeaguePlayerInput = Pick<LeaguePlayer, "user_id">;
