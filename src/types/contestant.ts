export interface ContestantAttributes {
  name: string;
  eliminated: boolean;
}

export interface Contestant extends ContestantAttributes {
  id: number;
  season_id: number;
}

export type CreateContestantInput = ContestantAttributes & {
  season_id: number;
};

export type UpdateContestantInput = ContestantAttributes;
