import type { IncomingMessage, ServerResponse } from "node:http";

import { AUDIT_ENTITIES } from "../audit";
import type { AuthContext } from "../auth/context";
import type { AppDatabase } from "../database";
import { sendError } from "../http/errors";
import { sendJson } from "../http/json";
import {
  buildListResponse,
  INVALID_ID_FILTER,
  paginate,
  parseOptionalId,
  parsePagination,
} from "../http/pagination";

export async function handleAuditRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  database: AppDatabase,
  auth: AuthContext | undefined,
): Promise<boolean> {
  if (url.pathname !== "/audit-log") {
    return false;
  }
  if (!auth) {
    sendError(response, 401, "UNAUTHENTICATED", "Authentication required");
    return true;
  }
  if (request.method !== "GET") {
    return false;
  }
  if (!auth.isAdmin) {
    sendError(response, 403, "FORBIDDEN", "Administrator access required");
    return true;
  }

  const pagination = parsePagination(url);
  const entityId = parseOptionalId(url, "entity_id");
  const actorId = parseOptionalId(url, "actor_id");
  const entity = url.searchParams.get("entity") ?? undefined;
  if (
    !pagination ||
    entityId === INVALID_ID_FILTER ||
    actorId === INVALID_ID_FILTER ||
    (entity !== undefined && !(AUDIT_ENTITIES as readonly string[]).includes(entity))
  ) {
    sendError(
      response,
      400,
      "VALIDATION_ERROR",
      "Invalid limit, cursor, entity, entity_id, or actor_id",
    );
    return true;
  }

  const rows = database.audit.list(pagination, { entity, entityId, actorId });
  sendJson(
    response,
    200,
    buildListResponse(paginate(rows, pagination.limit), pagination.limit),
  );
  return true;
}
