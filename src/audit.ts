import type { IncomingMessage, ServerResponse } from "node:http";

import type { AuthContext } from "./auth/context";
import type { AppDatabase } from "./database";
import { receivedBody, sentBody } from "./http/json";

export const AUDIT_ENTITIES = [
  "seasons",
  "contestants",
  "weeks",
  "results",
  "users",
  "leagues",
] as const;

const VERBS: Record<string, string> = {
  POST: "create",
  PATCH: "update",
  DELETE: "delete",
};

interface Target {
  entity: string;
  entityId: number | undefined;
  action: string;
}

/**
 * Decides whether a request is an auditable admin change, and what it changes.
 *
 * Official data (seasons, contestants, weeks, results) is admin-only, so every
 * change to it is logged. Users and leagues are ordinary people's data, so only
 * an admin acting on them is logged. Routine activity (picks, joining a league,
 * logging in) is deliberately not audited.
 */
export function auditTarget(
  method: string,
  pathname: string,
  auth: AuthContext,
): Target | undefined {
  const verb = VERBS[method];
  if (!verb) return undefined;

  const official = pathname.match(/^\/(seasons|contestants|weeks|results)(?:\/(\d+))?$/);
  if (official) {
    return {
      entity: official[1],
      entityId: official[2] ? Number(official[2]) : undefined,
      action: `${official[1]}.${verb}`,
    };
  }
  if (!auth.isAdmin) return undefined;

  const user = pathname.match(/^\/users\/(\d+)$/);
  if (user) {
    return { entity: "users", entityId: Number(user[1]), action: `users.${verb}` };
  }
  const league = pathname.match(
    /^\/leagues\/(\d+)(?:\/(invite-code|players)(?:\/\d+)?)?$/,
  );
  if (league) {
    const sub = league[2];
    const action =
      sub === "invite-code"
        ? "leagues.rotate_invite_code"
        : sub === "players"
          ? `leagues.${method === "DELETE" ? "remove_player" : "add_player"}`
          : `leagues.${verb}`;
    return { entity: "leagues", entityId: Number(league[1]), action };
  }
  return undefined;
}

/**
 * Records a successful audited change. Runs right after the handler, in the
 * same tick. It is not in the change's own database transaction, so a crash in
 * between could lose an entry. A failure here is logged and never reaches the
 * client, because the response has already been sent.
 */
export function recordAudit(
  database: AppDatabase,
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  auth: AuthContext | undefined,
): void {
  if (!auth || response.statusCode < 200 || response.statusCode >= 300) return;
  try {
    const target = auditTarget(request.method ?? "", url.pathname, auth);
    if (!target) return;
    const created = sentBody(response) as { id?: unknown } | undefined;
    database.audit.record({
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      method: request.method ?? "",
      path: url.pathname,
      action: target.action,
      entity: target.entity,
      entity_id:
        target.entityId ??
        (typeof created?.id === "number" ? created.id : null),
      status: response.statusCode,
      body: receivedBody(request),
    });
  } catch (error) {
    console.error(
      `Could not write audit entry: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}
