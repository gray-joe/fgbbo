export interface SeasonAttributes {
  name: string;
  active: boolean;
  starts_at: Date | null;
  ends_at: Date | null;
}

export interface Season extends SeasonAttributes {
  id: number;
}

export type CreateSeasonInput = SeasonAttributes;

export type UpdateSeasonInput = SeasonAttributes;
