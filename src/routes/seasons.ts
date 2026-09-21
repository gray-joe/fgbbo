import type { IncomingMessage, ServerResponse } from "node:http";

import type { AuthContext } from "../auth/context";
import type { AppDatabase } from "../database";
import { sendError } from "../http/errors";
import { readJson, sendJson } from "../http/json";
import { buildListResponse, paginate, parsePagination } from "../http/pagination";
import type { CreateSeasonInput, Season, UpdateSeasonInput } from "../types/season";

function parseDate(value: unknown): Date | null | undefined {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseCreateInput(body: unknown): CreateSeasonInput | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  const { name, active, starts_at, ends_at } = body as Record<
    string,
    unknown
  >;
  if (typeof name !== "string" || name.trim() === "") {
    return undefined;
  }
  if (active !== undefined && typeof active !== "boolean") {
    return undefined;
  }
  const startsAt = parseDate(starts_at);
  const endsAt = parseDate(ends_at);
  if (startsAt === undefined || endsAt === undefined) {
    return undefined;
  }

  return {
    name: name.trim(),
    active: typeof active === "boolean" ? active : false,
    starts_at: startsAt,
    ends_at: endsAt,
  };
}

interface SeasonPatchInput {
  name?: string;
  active?: boolean;
  starts_at?: Date | null;
  ends_at?: Date | null;
}

function parsePatchInput(body: unknown): SeasonPatchInput | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  const { name, active, starts_at, ends_at } = body as Record<
    string,
    unknown
  >;
  if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
    return undefined;
  }
  if (active !== undefined && typeof active !== "boolean") {
    return undefined;
  }
  const startsAt = starts_at === undefined ? undefined : parseDate(starts_at);
  const endsAt = ends_at === undefined ? undefined : parseDate(ends_at);
  if (starts_at !== undefined && startsAt === undefined) {
    return undefined;
  }
  if (ends_at !== undefined && endsAt === undefined) {
    return undefined;
  }

  return {
    name: typeof name === "string" ? name.trim() : undefined,
    active,
    starts_at: startsAt,
    ends_at: endsAt,
  };
}

function mergePatch(
  current: Season,
  patch: SeasonPatchInput,
): UpdateSeasonInput {
  return {
    name: patch.name ?? current.name,
    active: patch.active ?? current.active,
    starts_at: patch.starts_at !== undefined ? patch.starts_at : current.starts_at,
    ends_at: patch.ends_at !== undefined ? patch.ends_at : current.ends_at,
  };
}

export async function handleSeasonRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  database: AppDatabase,
  auth: AuthContext | undefined,
): Promise<boolean> {
  const isCollection = url.pathname === "/seasons";
  const match = url.pathname.match(/^\/seasons\/(\d+)$/);
  if (!isCollection && !match) {
    return false;
  }
  if (!auth) {
    sendError(response, 401, "UNAUTHENTICATED", "Authentication required");
    return true;
  }

  if (request.method === "GET" && isCollection) {
    const pagination = parsePagination(url);
    if (!pagination) {
      sendError(response, 400, "VALIDATION_ERROR", "Invalid limit or cursor");
      return true;
    }
    const rows = database.seasons.list(pagination);
    sendJson(
      response,
      200,
      buildListResponse(paginate(rows, pagination.limit), pagination.limit),
    );
    return true;
  }

  if (request.method === "POST" && isCollection) {
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
        "A name and valid active/starts_at/ends_at are required",
      );
      return true;
    }
    sendJson(response, 201, database.seasons.create(input));
    return true;
  }

  if (!match) {
    return false;
  }

  const id = Number(match[1]);
  if (request.method === "GET") {
    const season = database.seasons.get(id);
    if (!season) {
      sendError(response, 404, "NOT_FOUND", "Season not found");
      return true;
    }
    sendJson(response, 200, season);
    return true;
  }

  if (request.method === "PATCH") {
    if (!auth.isAdmin) {
      sendError(response, 403, "FORBIDDEN", "Administrator access required");
      return true;
    }
    const current = database.seasons.get(id);
    if (!current) {
      sendError(response, 404, "NOT_FOUND", "Season not found");
      return true;
    }
    const patch = parsePatchInput(await readJson(request));
    if (!patch) {
      sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "Name, active, starts_at, and ends_at must be valid if provided",
      );
      return true;
    }
    sendJson(
      response,
      200,
      database.seasons.update(id, mergePatch(current, patch)),
    );
    return true;
  }

  return false;
}
