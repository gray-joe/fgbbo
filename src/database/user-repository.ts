import type { DatabaseSync } from "node:sqlite";

import type { CreateUserInput, UpdateUserInput, User } from "../types/user";

interface UserRow {
  id: number;
  name: string;
  email: string;
  created_at: string;
  active: number;
  deleted_at: string | null;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    created_at: new Date(`${row.created_at}Z`),
    active: Boolean(row.active),
    deleted_at: row.deleted_at ? new Date(`${row.deleted_at}Z`) : null,
  };
}

export class UserRepository {
  constructor(private readonly database: DatabaseSync) {}

  list(pagination: { limit: number; cursor: number }): User[] {
    const rows = this.database
      .prepare(
        `SELECT id, name, email, created_at, active, deleted_at
         FROM users WHERE deleted_at IS NULL AND id > ?
         ORDER BY id LIMIT ?`,
      )
      .all(pagination.cursor, pagination.limit + 1) as unknown as UserRow[];
    return rows.map(toUser);
  }

  /** The viewer plus every user who shares a league with them. */
  listVisibleTo(
    viewerId: number,
    pagination: { limit: number; cursor: number },
  ): User[] {
    const rows = this.database
      .prepare(
        `SELECT id, name, email, created_at, active, deleted_at
         FROM users
         WHERE deleted_at IS NULL AND id > ?
           AND (id = ? OR id IN (
             SELECT other.user_id
             FROM league_players mine
             JOIN league_players other ON other.league_id = mine.league_id
             WHERE mine.user_id = ?))
         ORDER BY id LIMIT ?`,
      )
      .all(
        pagination.cursor,
        viewerId,
        viewerId,
        pagination.limit + 1,
      ) as unknown as UserRow[];
    return rows.map(toUser);
  }

  sharesLeague(userId: number, otherId: number): boolean {
    return Boolean(
      this.database
        .prepare(
          `SELECT 1
           FROM league_players a
           JOIN league_players b ON b.league_id = a.league_id
           WHERE a.user_id = ? AND b.user_id = ? LIMIT 1`,
        )
        .get(userId, otherId),
    );
  }

  get(id: number): User | undefined {
    const row = this.database
      .prepare(
        `SELECT id, name, email, created_at, active, deleted_at
         FROM users WHERE id = ? AND deleted_at IS NULL`,
      )
      .get(id) as unknown as UserRow | undefined;
    return row ? toUser(row) : undefined;
  }

  getByEmail(email: string): User | undefined {
    const row = this.database
      .prepare(
        `SELECT id, name, email, created_at, active, deleted_at
         FROM users WHERE email = ? AND deleted_at IS NULL`,
      )
      .get(email) as unknown as UserRow | undefined;
    return row ? toUser(row) : undefined;
  }

  create(input: CreateUserInput): User {
    const result = this.database
      .prepare("INSERT INTO users (name, email) VALUES (?, ?)")
      .run(input.name, input.email);
    return this.get(Number(result.lastInsertRowid))!;
  }

  update(id: number, input: UpdateUserInput): User | undefined {
    const result = this.database
      .prepare(
        `UPDATE users
         SET name = ?, email = ?, active = ?
         WHERE id = ? AND deleted_at IS NULL`,
      )
      .run(input.name, input.email, Number(input.active), id);
    return result.changes === 0 ? undefined : this.get(id);
  }

  delete(id: number): boolean {
    const result = this.database
      .prepare(
        `UPDATE users
         SET active = 0, deleted_at = CURRENT_TIMESTAMP
         WHERE id = ? AND deleted_at IS NULL`,
      )
      .run(id);
    return result.changes > 0;
  }
}
