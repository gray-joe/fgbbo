import type { IncomingMessage, ServerResponse } from "node:http";

import type { AuthContext } from "../auth/context";
import type { AppDatabase } from "../database";
import { sendError } from "../http/errors";
import { readJson, sendJson } from "../http/json";
import {
  buildListResponse,
  INVALID_ID_FILTER,
  paginate,
  parseOptionalId,
  parsePagination,
} from "../http/pagination";
import type {
  Contestant,
  CreateContestantInput,
  UpdateContestantInput,
} from "../types/contestant";

function parseCreateInput(body: unknown): CreateContestantInput | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  const { name, eliminated, season_id } = body as Record<string, unknown>;
  if (
    typeof name !== "string" ||
    name.trim() === "" ||
    typeof eliminated !== "boolean" ||
    typeof season_id !== "number" ||
    !Number.isSafeInteger(season_id) ||
    season_id < 1
  ) {
    return undefined;
  }

  return { name: name.trim(), eliminated, season_id };
}

interface ContestantPatchInput {
  name?: string;
  eliminated?: boolean;
}

function parsePatchInput(body: unknown): ContestantPatchInput | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  const { name, eliminated } = body as Record<string, unknown>;
  if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
    return undefined;
  }
  if (eliminated !== undefined && typeof eliminated !== "boolean") {
    return undefined;
  }

  return {
    name: typeof name === "string" ? name.trim() : undefined,
    eliminated,
  };
}

function mergePatch(
  current: Contestant,
  patch: ContestantPatchInput,
): UpdateContestantInput {
  return {
    name: patch.name ?? current.name,
    eliminated: patch.eliminated ?? current.eliminated,
  };
}

export async function handleContestantRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  database: AppDatabase,
  auth: AuthContext | undefined,
): Promise<boolean> {
  const isCollection = url.pathname === "/contestants";
  const match = url.pathname.match(/^\/contestants\/(\d+)$/);
  if (!isCollection && !match) {
    return false;
  }
  if (!auth) {
    sendError(response, 401, "UNAUTHENTICATED", "Authentication required");
    return true;
  }

  if (request.method === "GET" && url.pathname === "/contestants") {
    const pagination = parsePagination(url);
    const seasonId = parseOptionalId(url, "season_id");
    if (!pagination || seasonId === INVALID_ID_FILTER) {
      sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "Invalid limit, cursor, or season_id",
      );
      return true;
    }
    const rows = database.contestants.list(pagination, seasonId);
    sendJson(
      response,
      200,
      buildListResponse(paginate(rows, pagination.limit), pagination.limit),
    );
    return true;
  }

  if (request.method === "POST" && url.pathname === "/contestants") {
    if (!auth.isAdmin) {
      sendError(response, 403, "FORBIDDEN", "Administrator access required");
      return true;
    }
    const input = parseCreateInput(await readJson(request));
    if (!input) {
      sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "Name, eliminated, and a valid season_id are required",
      );
      return true;
    }
    if (!database.seasons.get(input.season_id)) {
      sendError(response, 404, "NOT_FOUND", "Season not found");
      return true;
    }
    sendJson(response, 201, database.contestants.create(input));
    return true;
  }

  if (!match) {
    return false;
  }

  const id = Number(match[1]);
  if (request.method === "GET") {
    const contestant = database.contestants.get(id);
    if (!contestant) {
      sendError(response, 404, "NOT_FOUND", "Contestant not found");
      return true;
    }
    sendJson(response, 200, contestant);
    return true;
  }

  if (request.method === "PATCH") {
    if (!auth.isAdmin) {
      sendError(response, 403, "FORBIDDEN", "Administrator access required");
      return true;
    }
    const current = database.contestants.get(id);
    if (!current) {
      sendError(response, 404, "NOT_FOUND", "Contestant not found");
      return true;
    }
    const patch = parsePatchInput(await readJson(request));
    if (!patch) {
      sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "Name and eliminated must be valid if provided",
      );
      return true;
    }
    sendJson(
      response,
      200,
      database.contestants.update(id, mergePatch(current, patch)),
    );
    return true;
  }

  if (request.method === "DELETE") {
    if (!auth.isAdmin) {
      sendError(response, 403, "FORBIDDEN", "Administrator access required");
      return true;
    }
    if (!database.contestants.get(id)) {
      sendError(response, 404, "NOT_FOUND", "Contestant not found");
      return true;
    }
    if (database.results.isContestantReferenced(id)) {
      sendError(
        response,
        409,
        "CONFLICT",
        "Contestant is referenced by an official result",
      );
      return true;
    }
    database.contestants.delete(id);
    response.writeHead(204);
    response.end();
    return true;
  }

  return false;
}
