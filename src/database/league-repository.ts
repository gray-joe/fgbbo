import type { DatabaseSync } from "node:sqlite";

import { generateInviteCode } from "../auth/tokens";
import type {
  CreateLeagueInput,
  League,
  UpdateLeagueInput,
} from "../types/league";

interface LeagueRow {
  id: number;
  name: string;
  owner: number;
  season_id: number;
  archived_at: string | null;
  invite_code: string;
}

function toLeague(row: LeagueRow): League {
  return {
    id: row.id,
    name: row.name,
    owner: row.owner,
    season_id: row.season_id,
    archived_at: row.archived_at ? new Date(`${row.archived_at}Z`) : null,
    invite_code: row.invite_code,
  };
}

const leagueColumns = "id, name, owner, season_id, archived_at, invite_code";

export class LeagueRepository {
  constructor(private readonly database: DatabaseSync) {}

  list(pagination: { limit: number; cursor: number }): League[] {
    const rows = this.database
      .prepare(
        `SELECT ${leagueColumns} FROM leagues
         WHERE id > ? ORDER BY id LIMIT ?`,
      )
      .all(pagination.cursor, pagination.limit + 1) as unknown as LeagueRow[];
    return rows.map(toLeague);
  }

  /** Leagues `userId` owns or belongs to. */
  listForUser(
    userId: number,
    pagination: { limit: number; cursor: number },
  ): League[] {
    const rows = this.database
      .prepare(
        `SELECT ${leagueColumns} FROM leagues
         WHERE id > ?
           AND (owner = ? OR id IN
             (SELECT league_id FROM league_players WHERE user_id = ?))
         ORDER BY id LIMIT ?`,
      )
      .all(
        pagination.cursor,
        userId,
        userId,
        pagination.limit + 1,
      ) as unknown as LeagueRow[];
    return rows.map(toLeague);
  }

  get(id: number): League | undefined {
    const row = this.database
      .prepare(`SELECT ${leagueColumns} FROM leagues WHERE id = ?`)
      .get(id) as unknown as LeagueRow | undefined;
    return row ? toLeague(row) : undefined;
  }

  getByInviteCode(inviteCode: string): League | undefined {
    const row = this.database
      .prepare(`SELECT ${leagueColumns} FROM leagues WHERE invite_code = ?`)
      .get(inviteCode) as unknown as LeagueRow | undefined;
    return row ? toLeague(row) : undefined;
  }

  private uniqueInviteCode(): string {
    let code = generateInviteCode();
    while (this.getByInviteCode(code)) {
      code = generateInviteCode();
    }
    return code;
  }

  create(input: CreateLeagueInput): League {
    const result = this.database
      .prepare(
        `INSERT INTO leagues (name, owner, season_id, invite_code)
         VALUES (?, ?, ?, ?)`,
      )
      .run(input.name, input.owner, input.season_id, this.uniqueInviteCode());
    return this.get(Number(result.lastInsertRowid))!;
  }

  update(id: number, input: UpdateLeagueInput): League | undefined {
    const result = this.database
      .prepare("UPDATE leagues SET name = ?, owner = ? WHERE id = ?")
      .run(input.name, input.owner, id);
    return result.changes === 0 ? undefined : this.get(id);
  }

  archive(id: number): League | undefined {
    const result = this.database
      .prepare(
        `UPDATE leagues SET archived_at = CURRENT_TIMESTAMP
         WHERE id = ? AND archived_at IS NULL`,
      )
      .run(id);
    return result.changes === 0 ? undefined : this.get(id);
  }

  rotateInviteCode(id: number): League | undefined {
    if (!this.get(id)) {
      return undefined;
    }
    this.database
      .prepare("UPDATE leagues SET invite_code = ? WHERE id = ?")
      .run(this.uniqueInviteCode(), id);
    return this.get(id);
  }
}
