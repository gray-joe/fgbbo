import type { DatabaseSync } from "node:sqlite";

import type { Result } from "../types/result";
import type { Score } from "../types/score";

const CATEGORY_POINTS = {
  star_baker: 10,
  technical_winner: 5,
  eliminated: 10,
  weekly_special: 3,
} as const;

interface MemberPick {
  league_id: number;
  user_id: number;
  star_baker: number;
  technical_winner: number;
  eliminated: number;
  weekly_special: number;
}

export interface ScoreTotals {
  user_id: number;
  star_baker_points: number;
  technical_winner_points: number;
  eliminated_points: number;
  weekly_special_points: number;
  total_points: number;
  correct_predictions: number;
}

const scoreColumns =
  "id, league_id, user_id, week_id, star_baker_points, technical_winner_points, " +
  "eliminated_points, weekly_special_points, total_points, correct_predictions";

export class ScoreRepository {
  constructor(private readonly database: DatabaseSync) {}

  recalculateForWeek(weekId: number, result: Result | undefined): void {
    this.database.prepare("DELETE FROM scores WHERE week_id = ?").run(weekId);
    if (!result) {
      return;
    }

    // Picks are league-agnostic: one prediction per (user, week), shared by
    // every league the user belongs to. Fan it out into one score row per
    // league membership so standings stay scoped to each league.
    const memberPicks = this.database
      .prepare(
        `SELECT lp.league_id AS league_id, lp.user_id AS user_id,
                p.star_baker AS star_baker, p.technical_winner AS technical_winner,
                p.eliminated AS eliminated, p.weekly_special AS weekly_special
         FROM league_players lp
         JOIN leagues l ON l.id = lp.league_id
         JOIN predictions p ON p.user_id = lp.user_id AND p.week_id = ?
         WHERE l.season_id = (SELECT season_id FROM weeks WHERE id = ?)`,
      )
      .all(weekId, weekId) as unknown as MemberPick[];

    const insert = this.database.prepare(
      `INSERT INTO scores (
         league_id, user_id, week_id, star_baker_points, technical_winner_points,
         eliminated_points, weekly_special_points, total_points, correct_predictions
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const prediction of memberPicks) {
      const starBakerPoints =
        prediction.star_baker === result.star_baker
          ? CATEGORY_POINTS.star_baker
          : 0;
      const technicalWinnerPoints =
        prediction.technical_winner === result.technical_winner
          ? CATEGORY_POINTS.technical_winner
          : 0;
      const eliminatedPoints =
        prediction.eliminated === result.eliminated
          ? CATEGORY_POINTS.eliminated
          : 0;
      const weeklySpecialPoints =
        prediction.weekly_special === result.weekly_special
          ? CATEGORY_POINTS.weekly_special
          : 0;
      const points = [
        starBakerPoints,
        technicalWinnerPoints,
        eliminatedPoints,
        weeklySpecialPoints,
      ];
      const totalPoints = points.reduce((sum, value) => sum + value, 0);
      const correctPredictions = points.filter((value) => value > 0).length;

      insert.run(
        prediction.league_id,
        prediction.user_id,
        weekId,
        starBakerPoints,
        technicalWinnerPoints,
        eliminatedPoints,
        weeklySpecialPoints,
        totalPoints,
        correctPredictions,
      );
    }
  }

  sumByUser(leagueId: number): ScoreTotals[] {
    return this.database
      .prepare(
        `SELECT user_id,
                SUM(star_baker_points) AS star_baker_points,
                SUM(technical_winner_points) AS technical_winner_points,
                SUM(eliminated_points) AS eliminated_points,
                SUM(weekly_special_points) AS weekly_special_points,
                SUM(total_points) AS total_points,
                SUM(correct_predictions) AS correct_predictions
         FROM scores WHERE league_id = ?
         GROUP BY user_id`,
      )
      .all(leagueId) as unknown as ScoreTotals[];
  }

  listForWeek(leagueId: number, weekId: number): Score[] {
    return this.database
      .prepare(
        `SELECT ${scoreColumns} FROM scores WHERE league_id = ? AND week_id = ?`,
      )
      .all(leagueId, weekId) as unknown as Score[];
  }
}
