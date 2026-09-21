export interface PredictionAttributes {
  user_id: number;
  week_id: number;
  star_baker: number;
  technical_winner: number;
  eliminated: number;
  weekly_special: number;
}

export interface Prediction extends PredictionAttributes {
  id: number;
  created_at: Date;
  updated_at: Date;
}

export type CreatePredictionInput = PredictionAttributes;

export type UpdatePredictionInput = Omit<
  PredictionAttributes,
  "user_id" | "week_id"
>;
