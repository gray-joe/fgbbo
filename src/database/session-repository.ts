import type { DatabaseSync } from "node:sqlite";

import { generateToken } from "../auth/tokens";

// Sessions stop working this long after login (SQLite datetime modifier).
const SESSION_LIFETIME = "-30 days";

export class SessionRepository {
  constructor(private readonly database: DatabaseSync) {}

  create(userId: number): string {
    const token = generateToken();
    this.database
      .prepare("DELETE FROM sessions WHERE created_at <= datetime('now', ?)")
      .run(SESSION_LIFETIME);
    this.database
      .prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)")
      .run(token, userId);
    return token;
  }

  getUserIdByToken(token: string): number | undefined {
    const row = this.database
      .prepare(
        `SELECT user_id FROM sessions
         WHERE token = ? AND created_at > datetime('now', ?)`,
      )
      .get(token, SESSION_LIFETIME) as unknown as { user_id: number } | undefined;
    return row?.user_id;
  }

  delete(token: string): boolean {
    const result = this.database
      .prepare("DELETE FROM sessions WHERE token = ?")
      .run(token);
    return result.changes > 0;
  }
}
