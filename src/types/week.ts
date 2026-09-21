export interface WeekAttributes {
  number: number;
  theme: string;
  prediction_deadline: Date;
}

export interface Week extends WeekAttributes {
  id: number;
  season_id: number;
}

export type CreateWeekInput = WeekAttributes & { season_id: number };

export type UpdateWeekInput = WeekAttributes;
