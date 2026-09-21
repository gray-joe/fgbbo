export interface ResultAttributes {
  week: number;
  star_baker: number;
  technical_winner: number;
  eliminated: number;
  weekly_special: number;
}

export interface Result extends ResultAttributes {
  id: number;
}

export type CreateResultInput = ResultAttributes;

export type UpdateResultInput = ResultAttributes;
