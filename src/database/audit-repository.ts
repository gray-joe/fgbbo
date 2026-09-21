import type { DatabaseSync } from "node:sqlite";

export interface AuditEntry {
  actor_id: number;
  actor_email: string;
  method: string;
  path: string;
  action: string;
  entity: string;
  entity_id: number | null;
  status: number;
  body: unknown;
}

export interface AuditRecord extends Omit<AuditEntry, "body"> {
  id: number;
  at: string;
  body: unknown;
}

interface AuditRow extends Omit<AuditRecord, "body"> {
  body: string | null;
}

const columns =
  "id, at, actor_id, actor_email, method, path, action, entity, entity_id, status, body";

export interface AuditFilter {
  entity?: string;
  entityId?: number;
  actorId?: number;
}

/** Append-only. There is deliberately no update or delete. */
export class AuditRepository {
  constructor(private readonly database: DatabaseSync) {}

  record(entry: AuditEntry): void {
    this.database
      .prepare(
        `INSERT INTO audit_log
           (at, actor_id, actor_email, method, path, action, entity, entity_id, status, body)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        new Date().toISOString(),
        entry.actor_id,
        entry.actor_email,
        entry.method,
        entry.path,
        entry.action,
        entry.entity,
        entry.entity_id,
        entry.status,
        entry.body === undefined ? null : JSON.stringify(entry.body),
      );
  }

  /** Newest first. `cursor` is the id of the last entry already seen (0 for none). */
  list(
    pagination: { limit: number; cursor: number },
    filter: AuditFilter = {},
  ): AuditRecord[] {
    const where: string[] = [];
    const params: (string | number)[] = [];
    if (pagination.cursor > 0) {
      where.push("id < ?");
      params.push(pagination.cursor);
    }
    if (filter.entity !== undefined) {
      where.push("entity = ?");
      params.push(filter.entity);
    }
    if (filter.entityId !== undefined) {
      where.push("entity_id = ?");
      params.push(filter.entityId);
    }
    if (filter.actorId !== undefined) {
      where.push("actor_id = ?");
      params.push(filter.actorId);
    }
    const rows = this.database
      .prepare(
        `SELECT ${columns} FROM audit_log
         ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
         ORDER BY id DESC LIMIT ?`,
      )
      .all(...params, pagination.limit + 1) as unknown as AuditRow[];
    return rows.map((row) => ({
      ...row,
      body: row.body === null ? undefined : JSON.parse(row.body),
    }));
  }
}
