import { DatabaseSync } from "node:sqlite";

import { AuditRepository } from "./database/audit-repository";
import { ContestantRepository } from "./database/contestant-repository";
import { LeaguePlayerRepository } from "./database/league-player-repository";
import { LeagueRepository } from "./database/league-repository";
import { LoginCodeRepository } from "./database/login-code-repository";
import { PredictionRepository } from "./database/prediction-repository";
import { ResultRepository } from "./database/result-repository";
import { initializeSchema } from "./database/schema";
import { ScoreRepository } from "./database/score-repository";
import { SeasonRepository } from "./database/season-repository";
import { SessionRepository } from "./database/session-repository";
import { UserRepository } from "./database/user-repository";
import { WeekRepository } from "./database/week-repository";

export class AppDatabase {
  private readonly connection: DatabaseSync;
  readonly audit: AuditRepository;
  readonly contestants: ContestantRepository;
  readonly leaguePlayers: LeaguePlayerRepository;
  readonly leagues: LeagueRepository;
  readonly loginCodes: LoginCodeRepository;
  readonly predictions: PredictionRepository;
  readonly results: ResultRepository;
  readonly scores: ScoreRepository;
  readonly seasons: SeasonRepository;
  readonly sessions: SessionRepository;
  readonly users: UserRepository;
  readonly weeks: WeekRepository;

  constructor(path: string) {
    this.connection = new DatabaseSync(path);
    initializeSchema(this.connection);
    this.audit = new AuditRepository(this.connection);
    this.contestants = new ContestantRepository(this.connection);
    this.leaguePlayers = new LeaguePlayerRepository(this.connection);
    this.leagues = new LeagueRepository(this.connection);
    this.loginCodes = new LoginCodeRepository(this.connection);
    this.predictions = new PredictionRepository(this.connection);
    this.scores = new ScoreRepository(this.connection);
    this.results = new ResultRepository(this.connection, this.scores);
    this.seasons = new SeasonRepository(this.connection);
    this.sessions = new SessionRepository(this.connection);
    this.users = new UserRepository(this.connection);
    this.weeks = new WeekRepository(this.connection);
  }

  close(): void {
    this.connection.close();
  }
}
