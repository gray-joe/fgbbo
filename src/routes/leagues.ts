import type { IncomingMessage, ServerResponse } from "node:http";

import type { AuthContext } from "../auth/context";
import type { AppDatabase } from "../database";
import { isLeagueMember } from "../domain/league-membership";
import { sendError } from "../http/errors";
import { readJson, sendJson } from "../http/json";
import { buildListResponse, paginate, parsePagination } from "../http/pagination";
import type { League, UpdateLeagueInput } from "../types/league";

function parseCreateInput(
  body: unknown,
): { name: string; season_id: number } | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  const { name, season_id } = body as Record<string, unknown>;
  if (
    typeof name !== "string" ||
    name.trim() === "" ||
    typeof season_id !== "number" ||
    !Number.isSafeInteger(season_id) ||
    season_id < 1
  ) {
    return undefined;
  }

  return { name: name.trim(), season_id };
}

interface LeaguePatchInput {
  name?: string;
  owner?: number;
}

function parsePatchInput(body: unknown): LeaguePatchInput | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  const { name, owner } = body as Record<string, unknown>;
  if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
    return undefined;
  }
  if (
    owner !== undefined &&
    (typeof owner !== "number" || !Number.isSafeInteger(owner) || owner < 1)
  ) {
    return undefined;
  }

  return {
    name: typeof name === "string" ? name.trim() : undefined,
    owner,
  };
}

function mergePatch(
  current: League,
  patch: LeaguePatchInput,
): UpdateLeagueInput {
  return {
    name: patch.name ?? current.name,
    owner: patch.owner ?? current.owner,
  };
}

function parseJoinInput(body: unknown): { invite_code: string } | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  const { invite_code } = body as Record<string, unknown>;
  if (typeof invite_code !== "string" || invite_code.trim() === "") {
    return undefined;
  }

  return { invite_code: invite_code.trim() };
}

function canView(
  database: AppDatabase,
  league: League,
  auth: AuthContext,
): boolean {
  return auth.isAdmin || isLeagueMember(database, league, auth.user.id);
}

type LeagueResponse = Omit<League, "invite_code"> & {
  invite_code: string | null;
};

function toResponse(league: League, auth: AuthContext): LeagueResponse {
  const canSeeCode = auth.isAdmin || league.owner === auth.user.id;
  return { ...league, invite_code: canSeeCode ? league.invite_code : null };
}

export async function handleLeagueRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  database: AppDatabase,
  auth: AuthContext | undefined,
): Promise<boolean> {
  const isCollection = url.pathname === "/leagues";
  const isJoin = url.pathname === "/leagues/join";
  const inviteCodeMatch = url.pathname.match(
    /^\/leagues\/(\d+)\/invite-code$/,
  );
  const match = url.pathname.match(/^\/leagues\/(\d+)$/);
  if (!isCollection && !isJoin && !inviteCodeMatch && !match) {
    return false;
  }
  if (!auth) {
    sendError(response, 401, "UNAUTHENTICATED", "Authentication required");
    return true;
  }

  if (request.method === "POST" && url.pathname === "/leagues/join") {
    const input = parseJoinInput(await readJson(request));
    if (!input) {
      sendError(response, 400, "VALIDATION_ERROR", "An invite_code is required");
      return true;
    }
    const league = database.leagues.getByInviteCode(input.invite_code);
    if (!league) {
      sendError(response, 404, "NOT_FOUND", "Invalid invite code");
      return true;
    }
    if (league.archived_at) {
      sendError(response, 409, "CONFLICT", "League is archived");
      return true;
    }
    if (database.leaguePlayers.has(league.id, auth.user.id)) {
      sendError(response, 409, "CONFLICT", "User is already in this league");
      return true;
    }
    database.leaguePlayers.add(league.id, auth.user.id);
    sendJson(response, 201, toResponse(league, auth));
    return true;
  }

  if (request.method === "GET" && url.pathname === "/leagues") {
    const pagination = parsePagination(url);
    if (!pagination) {
      sendError(response, 400, "VALIDATION_ERROR", "Invalid limit or cursor");
      return true;
    }
    const rows = auth.isAdmin
      ? database.leagues.list(pagination)
      : database.leagues.listForUser(auth.user.id, pagination);
    const { items, nextCursor } = paginate(rows, pagination.limit);
    sendJson(
      response,
      200,
      buildListResponse(
        { items: items.map((league) => toResponse(league, auth)), nextCursor },
        pagination.limit,
      ),
    );
    return true;
  }

  if (request.method === "POST" && url.pathname === "/leagues") {
    const input = parseCreateInput(await readJson(request));
    if (!input) {
      sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "Name and a valid season_id are required",
      );
      return true;
    }
    if (!database.seasons.get(input.season_id)) {
      sendError(response, 404, "NOT_FOUND", "Season not found");
      return true;
    }
    const league = database.leagues.create({
      name: input.name,
      owner: auth.user.id,
      season_id: input.season_id,
    });
    database.leaguePlayers.add(league.id, auth.user.id);
    sendJson(response, 201, toResponse(league, auth));
    return true;
  }

  if (inviteCodeMatch && request.method === "POST") {
    const id = Number(inviteCodeMatch[1]);
    const league = database.leagues.get(id);
    if (!league) {
      sendError(response, 404, "NOT_FOUND", "League not found");
      return true;
    }
    if (!auth.isAdmin && league.owner !== auth.user.id) {
      sendError(
        response,
        403,
        "FORBIDDEN",
        "Only the league owner may rotate the invite code",
      );
      return true;
    }
    if (league.archived_at) {
      sendError(response, 409, "CONFLICT", "League is archived");
      return true;
    }
    const rotated = database.leagues.rotateInviteCode(id)!;
    sendJson(response, 200, toResponse(rotated, auth));
    return true;
  }

  if (!match) {
    return false;
  }

  const id = Number(match[1]);
  const league = database.leagues.get(id);

  if (request.method === "GET") {
    if (!league) {
      sendError(response, 404, "NOT_FOUND", "League not found");
      return true;
    }
    if (!canView(database, league, auth)) {
      sendError(
        response,
        403,
        "FORBIDDEN",
        "Only league members may view this league",
      );
      return true;
    }
    sendJson(response, 200, toResponse(league, auth));
    return true;
  }

  if (request.method === "PATCH") {
    if (!league) {
      sendError(response, 404, "NOT_FOUND", "League not found");
      return true;
    }
    if (!auth.isAdmin && league.owner !== auth.user.id) {
      sendError(
        response,
        403,
        "FORBIDDEN",
        "Only the league owner may update this league",
      );
      return true;
    }
    if (league.archived_at) {
      sendError(response, 409, "CONFLICT", "League is archived");
      return true;
    }
    const patch = parsePatchInput(await readJson(request));
    if (!patch) {
      sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "Name and owner must be valid if provided",
      );
      return true;
    }
    const merged = mergePatch(league, patch);
    if (!database.users.get(merged.owner)) {
      sendError(response, 404, "NOT_FOUND", "Owner user not found");
      return true;
    }
    if (
      merged.owner !== league.owner &&
      !database.leaguePlayers.has(id, merged.owner)
    ) {
      sendError(
        response,
        409,
        "CONFLICT",
        "New owner must already be a league member",
      );
      return true;
    }
    sendJson(
      response,
      200,
      toResponse(database.leagues.update(id, merged)!, auth),
    );
    return true;
  }

  if (request.method === "DELETE") {
    if (!league) {
      sendError(response, 404, "NOT_FOUND", "League not found");
      return true;
    }
    if (!auth.isAdmin && league.owner !== auth.user.id) {
      sendError(
        response,
        403,
        "FORBIDDEN",
        "Only the league owner may archive this league",
      );
      return true;
    }
    if (league.archived_at) {
      sendError(response, 409, "CONFLICT", "League is already archived");
      return true;
    }
    database.leagues.archive(id);
    response.writeHead(204);
    response.end();
    return true;
  }

  return false;
}
