export interface LeagueAttributes {
  name: string;
  owner: number;
}

export interface League extends LeagueAttributes {
  id: number;
  season_id: number;
  archived_at: Date | null;
  invite_code: string;
}

export type CreateLeagueInput = LeagueAttributes & { season_id: number };

export type UpdateLeagueInput = LeagueAttributes;
