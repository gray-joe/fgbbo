import type { IncomingMessage, ServerResponse } from "node:http";

import type { AuthContext } from "../auth/context";
import type { AppDatabase } from "../database";
import { isLeagueMember } from "../domain/league-membership";
import { sendError } from "../http/errors";
import { readJson, sendJson } from "../http/json";
import { paginateBy, parsePagination } from "../http/pagination";
import type { AddLeaguePlayerInput } from "../types/league-player";

function parseInput(body: unknown): AddLeaguePlayerInput | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  const { user_id } = body as Record<string, unknown>;
  if (
    typeof user_id !== "number" ||
    !Number.isSafeInteger(user_id) ||
    user_id < 1
  ) {
    return undefined;
  }

  return { user_id };
}

export async function handleLeaguePlayerRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  database: AppDatabase,
  auth: AuthContext | undefined,
): Promise<boolean> {
  const collectionMatch = url.pathname.match(
    /^\/leagues\/(\d+)\/players$/,
  );
  if (
    collectionMatch &&
    (request.method === "GET" || request.method === "POST")
  ) {
    if (!auth) {
      sendError(response, 401, "UNAUTHENTICATED", "Authentication required");
      return true;
    }

    const leagueId = Number(collectionMatch[1]);
    const league = database.leagues.get(leagueId);
    if (!league) {
      sendError(response, 404, "NOT_FOUND", "League not found");
      return true;
    }

    if (request.method === "GET") {
      if (!auth.isAdmin && !isLeagueMember(database, league, auth.user.id)) {
        sendError(
          response,
          403,
          "FORBIDDEN",
          "Only league members may view this league's members",
        );
        return true;
      }
      const pagination = parsePagination(url);
      if (!pagination) {
        sendError(
          response,
          400,
          "VALIDATION_ERROR",
          "Invalid limit or cursor",
        );
        return true;
      }
      const rows = database.leaguePlayers.list(leagueId, pagination);
      const { items, nextCursor } = paginateBy(
        rows,
        pagination.limit,
        (row) => row.user_id,
      );
      sendJson(response, 200, {
        data: items,
        pagination: { next_cursor: nextCursor, limit: pagination.limit },
      });
      return true;
    }

    if (!auth.isAdmin && league.owner !== auth.user.id) {
      sendError(
        response,
        403,
        "FORBIDDEN",
        "Only the league owner may add members",
      );
      return true;
    }
    if (league.archived_at) {
      sendError(response, 409, "CONFLICT", "League is archived");
      return true;
    }

    const input = parseInput(await readJson(request));
    if (!input) {
      sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "A valid numeric user_id is required",
      );
      return true;
    }
    if (!database.users.get(input.user_id)) {
      sendError(response, 404, "NOT_FOUND", "User not found");
      return true;
    }
    if (database.leaguePlayers.has(leagueId, input.user_id)) {
      sendError(response, 409, "CONFLICT", "User is already in this league");
      return true;
    }
    sendJson(
      response,
      201,
      database.leaguePlayers.add(leagueId, input.user_id),
    );
    return true;
  }

  const memberMatch = url.pathname.match(
    /^\/leagues\/(\d+)\/players\/(\d+)$/,
  );
  if (!memberMatch || request.method !== "DELETE") {
    return false;
  }

  if (!auth) {
    sendError(response, 401, "UNAUTHENTICATED", "Authentication required");
    return true;
  }

  const leagueId = Number(memberMatch[1]);
  const userId = Number(memberMatch[2]);
  const league = database.leagues.get(leagueId);
  if (!league) {
    sendError(response, 404, "NOT_FOUND", "League not found");
    return true;
  }
  const isSelf = auth.user.id === userId;
  const isOwnerActing = league.owner === auth.user.id;
  if (!auth.isAdmin && !isSelf && !isOwnerActing) {
    sendError(
      response,
      403,
      "FORBIDDEN",
      "Only the league owner may remove other members",
    );
    return true;
  }
  if (league.archived_at) {
    sendError(response, 409, "CONFLICT", "League is archived");
    return true;
  }
  if (userId === league.owner) {
    sendError(
      response,
      409,
      "CONFLICT",
      "The league owner must transfer ownership before leaving",
    );
    return true;
  }
  if (!database.leaguePlayers.remove(leagueId, userId)) {
    sendError(response, 404, "NOT_FOUND", "League player not found");
    return true;
  }
  response.writeHead(204);
  response.end();
  return true;
}
