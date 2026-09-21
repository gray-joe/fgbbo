export interface Score {
  id: number;
  league_id: number;
  user_id: number;
  week_id: number;
  star_baker_points: number;
  technical_winner_points: number;
  eliminated_points: number;
  weekly_special_points: number;
  total_points: number;
  correct_predictions: number;
}
